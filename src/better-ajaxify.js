(function(DOM, location) {
    "use strict";

    DOM.ready(function() {
        var // internal data structures
            historyData = {},
            currentLocation = location.href.split("#")[0],
            // use late binding to determine when element could be removed from DOM
            attachAjaxifyHandlers = function(el) {
                el.on(["animationend", "transitionend"], el, "_handleAjaxify");
            },
            containers = DOM.findAll("[data-ajaxify]").each(attachAjaxifyHandlers),
            switchContent = (function() {
                var prevContainers = {},
                    // remove element from dom and cleanup
                    _handleAjaxify = function() { delete this.remove()._handleAjaxify };

                return function(response) {
                    var cacheEntry = {html: {}, title: DOM.get("title"), url: currentLocation};

                    containers.each(function(el, index) {
                        var key = el.data("ajaxify"),
                            content = response.html[key];

                        // make sure that previous element is hidden
                        if (key in prevContainers) _handleAjaxify.call(prevContainers[key]);

                        if (content != null) {
                            if (typeof content === "string") {
                                content = el.clone(false).set(content);

                                attachAjaxifyHandlers(content);
                            }

                            el.before(content.hide());
                            // show/hide content async to display animation
                            setTimeout(function() { el.hide() }, 0);
                            setTimeout(function() { content.show() }, 0);
                            // postpone removing element from DOM if an animation exists
                            if (!el.matches(":hidden") && (
                                parseFloat(el.style("transition-duration")) ||
                                parseFloat(el.style("animation-duration")))) {
                                el._handleAjaxify = _handleAjaxify;
                            } else {
                                el.remove();
                            }

                            cacheEntry.html[key] = el;
                            // update content in the internal collection
                            containers[index] = content;
                        }
                    });
                    // update old containers to their latest state
                    historyData[currentLocation] = cacheEntry;
                    // update current location variable
                    currentLocation = response.url;
                    // update page title
                    DOM.set("title", response.title);
                };
            }());

        DOM.on("ajaxify:fetch", (function() {
            // lock element to prevent double clicks
            var lockedEl, xhr, timerId;

            return function(url, target, cancel) {
                if (cancel) return;

                var queryString = null;

                if (typeof url !== "string") {
                    if (target === DOM || !target.matches("a,form")) {
                        throw "Illegal ajaxify:fetch event with {" + String(url) + "}";
                    }

                    if (target.matches("a")) {
                        url = target.get("href");
                    } else {
                        url = target.get("action");
                        queryString = target.toQueryString();

                        if (target.get("method") === "get") {
                            url += (~url.indexOf("?") ? "&" : "?") + queryString;
                            queryString = null;
                        }
                    }
                }

                if (lockedEl === target && target !== DOM) return;

                lockedEl = target;

                if (xhr) {
                    // abort previous request if it's still in progress
                    // skip cases when refresh was triggered programatically
                    if (target !== DOM) {
                        xhr.abort();

                        target.fire("ajaxify:abort", xhr);
                    }

                    clearTimeout(timerId);
                }

                xhr = new XMLHttpRequest();
                timerId = setTimeout(function() {
                    xhr.abort();

                    target.fire("ajaxify:timeout", xhr);
                }, 15000);

                xhr.onerror = function() { target.fire("ajaxify:error", this) };
                xhr.onreadystatechange = function() {
                    if (this.readyState === 4) {
                        var status = this.status,
                            response = this.responseText;

                        // cleanup outer variables
                        lockedEl = xhr = null;
                        clearTimeout(timerId);

                        target.fire("ajaxify:loadend", this);

                        try {
                            response = JSON.parse(response);
                            // populate default values
                            response.url = response.url || url;
                            response.title = response.title || DOM.get("title");
                            response.html = response.html || {};
                        } catch (err) {
                            // response is a text content
                        } finally {
                            if (typeof response === "object") switchContent(response);

                            if (status >= 200 && status < 300 || status === 304) {
                                target.fire("ajaxify:load", response);
                            } else {
                                target.fire("ajaxify:error", this);
                            }
                        }
                    }
                };

                xhr.open(queryString ? "POST" : "GET", queryString ? url : (url + (~url.indexOf("?") ? "&" : "?") + new Date().getTime()), true);
                xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

                if (queryString) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                target.fire("ajaxify:loadstart", xhr);

                xhr.send(queryString);
            };
        }()));

        DOM.on("click a", function(link, cancel) {
            if (!cancel && !link.get("target") && !link.get("href").indexOf("http")) return !link.fire("ajaxify:fetch", true);
        });

        DOM.on("submit", function(form, cancel) {
            if (!cancel && !form.get("target")) return !form.fire("ajaxify:fetch", true);
        });

        DOM.on("ajaxify:history", function(url) {
            if (url in historyData) {
                switchContent(historyData[url]);
            } else {
                DOM.fire("ajaxify:fetch", url);
            }
        });
    });

    var makePair = function(name, value) {
        return encodeURIComponent(name) + "=" + encodeURIComponent(value);
    };

    DOM.extend("form", {
        constructor: function() {
            var submits = this.findAll("[type=submit]");

            this.on("ajaxify:fetch", function() {
                submits.set("disabled", true);
            });

            this.on(["ajaxify:load", "ajaxify:error", "ajaxify:abort", "ajaxify:timeout"], function() {
                submits.set("disabled", false);
            });
        },
        toQueryString: function() {
            return this.findAll("[name]").reduce(function(memo, el) {
                var name = el.get("name");

                if (name) { // don't include form fields without names
                    switch(el.get("type")) {
                    case "select-one":
                    case "select-multiple":
                        el.children().each(function(option) {
                            if (option.get("selected")) {
                                memo.push(makePair(name, option.get()));
                            }
                        });
                        break;

                    case undefined:
                    case "fieldset": // fieldset
                    case "file": // file input
                    case "submit": // submit button
                    case "reset": // reset button
                    case "button": // custom button
                        break;

                    case "radio": // radio button
                    case "checkbox": // checkbox
                        if (!el.get("checked")) break;
                        /* falls through */
                    default:
                        memo.push(makePair(name, el.get()));
                    }
                }

                return memo;
            }, []).join("&").replace(/%20/g, "+");
        }
    });
}(window.DOM, location));

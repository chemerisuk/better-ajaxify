(function(DOM, location) {
    "use strict";

    DOM.ready(function() {
        var // internal data structures
            historyData = {},
            currentLocation = location.href.split("#")[0],
            // use late binding to determine when element could be removed from DOM
            attachAjaxifyHandlers = function(el) {
                el.on(["animationend", "transitionend"], "_handleAjaxify");
            },
            containers = DOM.findAll("[data-ajaxify]").each(attachAjaxifyHandlers),
            switchContent = (function() {
                var prevContainers = {},
                    // remove element from dom and cleanup
                    _handleAjaxify = function() { delete this.remove()._handleAjaxify };

                return function(response) {
                    if (typeof response !== "object") return;

                    var cacheEntry = {html: {}, title: DOM.get("title"), url: currentLocation};

                    containers.each(function(el, index) {
                        var key = el.data("ajaxify"),
                            content = response.html[key];

                        // make sure that previous element is hidden
                        if (key in prevContainers) _handleAjaxify.call(prevContainers[key]);

                        if (content != null) {
                            if (typeof content === "string") {
                                attachAjaxifyHandlers(content = el.clone(false).set(content));
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
            var lockedEl,
                sharedXHR = new XMLHttpRequest(),
                createXHR = function(target, url, callback) {
                    var resultXHR = sharedXHR;

                    if (callback === switchContent) {
                        // abort previous request if it's still in progress but
                        // skip cases when refresh was triggered programatically
                        sharedXHR.abort();

                        if (lockedEl) lockedEl.fire("ajaxify:abort", sharedXHR);

                        lockedEl = target;
                    } else {
                        resultXHR = new XMLHttpRequest();
                    }

                    resultXHR.ontimeout = function() { target.fire("ajaxify:timeout", this) };
                    resultXHR.onerror = function() { target.fire("ajaxify:error", this) };
                    resultXHR.onreadystatechange = function() {
                        if (this.readyState === 4) {
                            var status = this.status,
                                response = this.responseText;

                            // cleanup outer variables
                            if (callback === switchContent) lockedEl = null;

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
                                callback(response);

                                if (status >= 200 && status < 300 || status === 304) {
                                    target.fire("ajaxify:load", response);
                                } else {
                                    target.fire("ajaxify:error", this);
                                }
                            }
                        }
                    };

                    return resultXHR;
                };

            return function(data, target, cancel) {
                if (arguments.length === 2) {
                    cancel = target;
                    target = data;
                    data = null;
                }

                if (cancel || lockedEl === target && target !== DOM) return;

                var url = typeof data === "string" ? data : null,
                    callback = typeof data === "function" ? data : switchContent,
                    queryString = null, xhr;

                if (!url) {
                    if (target === DOM || !target.matches("a,form")) {
                        throw "Illegal ajaxify:fetch event with {" + String(data) + "}";
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

                xhr = createXHR(target, url, callback);
                xhr.open(queryString ? "POST" : "GET", queryString ? url : (url + (~url.indexOf("?") ? "&" : "?") + new Date().getTime()), true);
                xhr.timeout = 15000;
                xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

                if (queryString) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                if (target.fire("ajaxify:loadstart", xhr)) xhr.send(queryString);
            };
        }()));

        DOM.on("click a", function(link, cancel) {
            if (!cancel && !link.get("target") && !link.get("href").indexOf("http")) return !link.fire("ajaxify:fetch");
        });

        DOM.on("submit", function(form, cancel) {
            if (!cancel && !form.get("target")) return !form.fire("ajaxify:fetch");
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

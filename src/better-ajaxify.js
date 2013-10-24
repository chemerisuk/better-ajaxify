(function(DOM, location) {
    "use strict";

    var loadContent = (function() {
            // lock element to prevent double clicks
            var lockedEl, xhr, timerId;

            return function(sender, url, data) {
                var abortXHR = function() {
                    xhr.abort();

                    sender.fire("ajaxify:abort", xhr);
                };

                if (lockedEl !== sender || sender === DOM) {
                    lockedEl = sender;

                    if (xhr) {
                        // abort previous request if it's still in progress
                        clearTimeout(timerId);

                        abortXHR();
                    }

                    xhr = new XMLHttpRequest();
                    timerId = setTimeout(abortXHR, 15000);

                    xhr.onerror = function() {
                        sender.fire("ajaxify:error", xhr);
                    };

                    xhr.onreadystatechange = function() {
                        if (this.readyState === 4) {
                            var status = this.status,
                                response = this.responseText;

                            // cleanup outer variables
                            lockedEl = xhr = null;
                            clearTimeout(timerId);

                            sender.fire("ajaxify:loadend", this);

                            if (status >= 200 && status < 300 || status === 304) {
                                try {
                                    response = JSON.parse(response);

                                    // populate default values
                                    response.url = response.url || url;
                                    response.title = response.title || DOM.getTitle();
                                    response.html = response.html || {};
                                } catch (err) {
                                    // response is a text content
                                } finally {
                                    sender.fire("ajaxify:load", response);
                                }
                            } else {
                                sender.fire("ajaxify:error", this);
                            }
                        }
                    };

                    xhr.open(data ? "POST" : "GET", data ? url : (url + (~url.indexOf("?") ? "&" : "?") + new Date().getTime()), true);
                    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

                    if (data) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                    sender.fire("ajaxify:loadstart", xhr);

                    xhr.send(data);
                }
            };
        }()),
        makePair = function(name, value) {
            return encodeURIComponent(name) + "=" + encodeURIComponent(value);
        };

    DOM.ready(function() {
        var // internal data structures
            historyData = {},
            // if browser supports animations use ~1s delay when removing an element from DOM
            timeoutDelay = window.CSSKeyframesRule || !document.attachEvent ? 999 : 0,
            currentLocation = location.href.split("#")[0],
            // use late binding to determine when element could be removed from DOM
            attachAjaxifyHandlers = function(el) {
                var events = ["animationend", "transitionend", "webkitAnimationEnd", "webkitTransitionEnd"];

                while (events.length) el.on(events.pop(), el, "_handleAjaxify");
            },
            switchContent = function(response) {
                var cacheEntry = {html: {}, title: DOM.getTitle(), url: currentLocation};

                containers.each(function(el, index) {
                    var key = el.data("ajaxify"),
                        content = response.html[key];

                    if (content != null) {
                        if (typeof content === "string") {
                            content = el.clone().set(content);

                            attachAjaxifyHandlers(content);
                        }

                        el.hide().before(content.hide());
                        // display content async to show animation
                        setTimeout(function() { content.show() }, 0);
                        // postpone removing element from DOM
                        el._handleAjaxify = function() {
                            if (el.parent().length) {
                                el.remove();
                                // no need to listen
                                delete el._handleAjaxify;
                            }
                        };
                        // use timeout as fallback when the element doesn't have animation
                        setTimeout(el._handleAjaxify, timeoutDelay);

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
                DOM.setTitle(response.title);
            },
            containers = DOM.findAll("[data-ajaxify]").each(attachAjaxifyHandlers);

        DOM.on("ajaxify:fetch", ["detail", "target", "defaultPrevented"], function(url, target, cancel) {
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

            loadContent(target, url, queryString);
        });

        DOM.on("click a", function(link, cancel) {
            if (!cancel && !link.get("target")) return !link.fire("ajaxify:fetch");
        });

        DOM.on("submit", function(form, cancel) {
            if (!cancel && !form.get("target")) return !form.fire("ajaxify:fetch");
        });

        DOM.on("ajaxify:load", ["detail", "defaultPrevented"], function(response, cancel) {
            if (!cancel && typeof response === "object") switchContent(response);
        });

        DOM.on("ajaxify:history", ["detail"], function(url) {
            if (url in historyData) {
                switchContent(historyData[url]);
            } else {
                // TODO: need to trigger partial reload?
                location.reload();
            }
        });
    });

    DOM.extend("form", {
        toQueryString: function() {
            return this.get("elements").reduce(function(memo, el) {
                var name = el.get("name");

                if (name) { // don't include form fields without names
                    switch(el.get("type")) {
                    case "select-one":
                    case "select-multiple":
                        el.get("options").each(function(option) {
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

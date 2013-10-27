/**
 * @file better-ajaxify.js
 * @version 1.4.0 2013-10-27T20:54:32
 * @overview SEO-friendly ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2013
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location) {
    "use strict";

    DOM.ready(function() {
        var // internal data structures
            historyData = {},
            currentLocation = location.href.split("#")[0],
            // use late binding to determine when element could be removed from DOM
            attachAjaxifyHandlers = function(el) {
                var events = ["animationend", "transitionend", "webkitAnimationEnd", "webkitTransitionEnd"];

                while (events.length) el.on(events.pop(), el, "_handleAjaxify");
            },
            switchContent = (function() {
                var prevContainers = [],
                    _handleAjaxify = function() {
                        // remove element from dom and cleanup
                        delete this.remove()._handleAjaxify;
                    };

                return function(response) {
                    var cacheEntry = {html: {}, title: DOM.get("title"), url: currentLocation};

                    while (prevContainers.length) _handleAjaxify.call(prevContainers.pop());

                    prevContainers = containers.map(function(el, index) {
                        var key = el.data("ajaxify"),
                            content = response.html[key];

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
                            if (parseFloat(el.style("transition-duration")) ||
                                parseFloat(el.style("animation-duration"))) {
                                el._handleAjaxify = _handleAjaxify;
                            } else {
                                el.remove();
                            }

                            cacheEntry.html[key] = el;
                            // update content in the internal collection
                            containers[index] = content;
                        }

                        return el;
                    });
                    // update old containers to their latest state
                    historyData[currentLocation] = cacheEntry;
                    // update current location variable
                    currentLocation = response.url;
                    // update page title
                    DOM.set("title", response.title);
                };
            }()),
            containers = DOM.findAll("[data-ajaxify]").each(attachAjaxifyHandlers);

        DOM.on("ajaxify:fetch", ["detail", "target", "defaultPrevented"], (function() {
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
                    xhr.abort();

                    clearTimeout(timerId);

                    target.fire("ajaxify:abort", xhr);
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

                        if (status >= 200 && status < 300 || status === 304) {
                            try {
                                response = JSON.parse(response);

                                // populate default values
                                response.url = response.url || url;
                                response.title = response.title || DOM.get("title");
                                response.html = response.html || {};
                            } catch (err) {
                                // response is a text content
                            } finally {
                                target.fire("ajaxify:load", response);
                            }
                        } else {
                            target.fire("ajaxify:error", this);
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

        DOM.on("ontouchstart" in document.documentElement ? "touchstart a" : "click a", function(link, cancel) {
            if (!cancel && !link.get("target")) return !link.fire("ajaxify:fetch");
        });

        DOM.on("submit", (function() {
            var toggleAjaxifyEvents = function(el, method, callback) {
                var events = ["load", "error", "abort", "timeout"];

                while (events.length) el[method]("ajaxify:" + events.pop(), callback);
            };

            return function(form, cancel) {
                if (!cancel && !form.get("target")) {
                    var submits = form.findAll("[type=submit]"),
                        callback = function() {
                            submits.set("disabled", false);

                            toggleAjaxifyEvents(form, "off", callback);
                        };

                    submits.set("disabled", true);

                    toggleAjaxifyEvents(form, "on", callback);

                    return !form.fire("ajaxify:fetch");
                }
            };
        }()));

        DOM.on("ajaxify:load", ["detail", "defaultPrevented"], function(response, cancel) {
            if (!cancel && typeof response === "object") switchContent(response);
        });

        DOM.on("ajaxify:history", ["detail"], function(url) {
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

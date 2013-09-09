/**
 * @file better-ajaxify.js
 * @version 1.1.0 2013-09-09T18:09:20
 * @overview SEO-friendly ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2013
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location, history) {
    "use strict";

    var // internal data structures
        containers = DOM.findAll("[data-ajaxify]"),
        containersCache = {},
        // helpers
        switchContent = (function() {
            var currentLocation = location.href.split("#")[0];

            return function(url, title, data) {
                var cacheEntry = {};

                containers.each(function(el, index) {
                    var key = el.getData("ajaxify"),
                        value = data[key];

                    if (typeof value === "string") {
                        value = el.clone().set(value);
                    }

                    cacheEntry[key] = el.replace(value);
                    // update value in the internal collection
                    containers[index] = value;
                });
                // update old containers to their latest state
                containersCache[currentLocation] = cacheEntry;
                // update current location variable
                currentLocation = url;
                // update page title
                DOM.setTitle(title);
            };
        }()),
        loadContent = (function() {
            // lock element to prevent double clicks
            var lockedEl, xhr, timerId;

            return function(sender, url, data) {
                var abortXHR = function() {
                    xhr.abort();

                    sender.fire("ajaxify:abort", xhr);
                };

                if (lockedEl !== sender) {
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
                        if (xhr.readyState === 4) {
                            var status = xhr.status,
                                response = xhr.responseText;

                            sender.fire("ajaxify:loadend", xhr);

                            if (status >= 200 && status < 300 || status === 304) {
                                try {
                                    response = JSON.parse(response);
                                    response.url = response.url || url;
                                } catch(err) {
                                    // response is a text content
                                } finally {
                                    sender.fire("ajaxify:success", response);
                                }
                            } else {
                                sender.fire("ajaxify:error", xhr);
                            }

                            clearTimeout(timerId);

                            xhr = null; // memory cleanup
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

    // use mousedown/touchstart for faster ajax request
    DOM.on((DOM.supports("ontouchstart") ? "touchstart": "click") + " a", function(link, cancel) {
        if (!link.matches("a")) link = link.parent("a");

        if (cancel || link.get("target")) return;

        var url = link.get("href");

        if (url) {
            url = url.split("#")[0];

            if (url !== location.href.split("#")[0]) {
                // prevent default behavior for links
                return !link.fire("ajaxify:fetch");
            }
        }
    });

    DOM.on("submit", function(form, cancel) {
        if (!cancel && !form.get("target")) {
            return !form.fire("ajaxify:fetch");
        }
    });

    DOM.on("ajaxify:fetch", ["detail", "target", "defaultPrevented"], function(url, target, cancel) {
        if (cancel) return;

        var queryString;

        if (typeof url !== "string") {
            if (target.matches("a")) {
                url = target.get("href");
            } else if (target.matches("form")) {
                url = target.get("action");
                queryString = target.toQueryString();

                if (target.get("method") === "get") {
                    url += (~url.indexOf("?") ? "&" : "?") + queryString;
                } else {
                    queryString = null;
                }
            } else {
                throw "Illegal ajaxify:fetch event";
            }
        }

        loadContent(target, url, queryString);
    });

    DOM.on("ajaxify:success", ["detail"], function(response) {
        if (typeof response === "object") {
            switchContent(response.url, response.title, response.html);
            // update browser url
            if (response.url !== location.pathname) {
                history.pushState({title: DOM.getTitle()}, DOM.getTitle(), response.url);
            } else if (history.replaceState) {
                history.replaceState({title: DOM.getTitle()}, DOM.getTitle());
            }
        }
    });

    if (history.pushState) {
        window.addEventListener("popstate", function(e) {
            var url = location.href.split("#")[0],
                state = e.state;

            if (!state) return;

            if (url in containersCache) {
                switchContent(url, state.title, containersCache[url]);
            } else {
                // TODO: need to trigger partial reload?
                location.reload();
            }
        }, false);
        // update initial state
        history.replaceState({title: DOM.getTitle()}, DOM.getTitle());
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", function(sender, defaultPrevented) {
            if (!defaultPrevented && sender.get("method") !== "post") {
                // load a new page in legacy browsers
                if (sender.matches("form")) {
                    sender.fire("submit");
                } else {
                    location.href = sender.get("href");
                }
            }
        });
    }

    DOM.extend("input,select,textarea", {
        toQueryString: function() {
            var name = this.get("name"),
                result = [];

            if (name) { // don't include form fields without names
                switch(this.get("type")) {
                case "select-one":
                case "select-multiple":
                    this.get("options").each(function(option) {
                        if (option.get("selected")) {
                            result.push(makePair(name, option.get()));
                        }
                    });
                    break;

                case "file": // file input
                case "submit": // submit button
                case "reset": // reset button
                case "button": // custom button
                    break;

                case "radio": // radio button
                case "checkbox": // checkbox
                    if (!this.get("checked")) break;
                    /* falls through */
                default:
                    result.push(makePair(name, this.get()));
                }
            }

            return result.join("&").replace(/%20/g, "+");
        }
    });

    DOM.extend("form,fieldset", {
        toQueryString: function() {
            return this.get("elements").reduce(function(memo, el) {
                if (el.toQueryString && !el.matches("fieldset")) {
                    var str = el.toQueryString();

                    if (str) memo += (memo ? "&" : "") + str;
                }

                return memo;
            }, "");
        }
    });

    if (typeof define === "function" && define.amd) {
        define("better-ajaxify", ["better-dom"], function() {});
    }
}(window.DOM, location, history));

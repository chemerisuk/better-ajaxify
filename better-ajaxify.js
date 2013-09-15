/**
 * @file better-ajaxify.js
 * @version 1.2.0 2013-09-15T15:52:30
 * @overview SEO-friendly ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2013
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location) {
    "use strict";

    var // internal data structures
        containers = DOM.findAll("[data-ajaxify]"),
        historyData = {},
        // helpers
        switchContent = (function() {
            var currentLocation = location.href.split("#")[0];

            return function(url, response) {
                var cacheEntry = {html: {}, title: response.title};

                containers.each(function(el, index) {
                    var key = el.getData("ajaxify"),
                        value = response.html[key];

                    if (value) {
                        if (typeof value === "string") {
                            value = el.clone().set(value);
                        }

                        cacheEntry.html[key] = el.replace(value);
                        // update value in the internal collection
                        containers[index] = value;
                    }
                });
                // update old containers to their latest state
                historyData[currentLocation] = cacheEntry;
                // update current location variable
                currentLocation = url;
                // update page title
                DOM.setTitle(response.title);
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

                                    // populate default values
                                    response.url = response.url || url;
                                    response.title = response.title || DOM.geTitle();
                                    response.html = response.html || {};

                                    switchContent(response.url, response);
                                } catch(err) {
                                    // response is a text content
                                } finally {
                                    sender.fire("ajaxify:load", response);
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

    DOM.on("click a", function(link, cancel) {
        if (!link.matches("a")) link = link.parent("a");

        if (!cancel && !link.get("target")) {
            return !link.fire("ajaxify:fetch");
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
                    queryString = null;
                }
            } else {
                throw "Illegal ajaxify:fetch event";
            }
        }

        loadContent(target, url, queryString);
    });

    DOM.on("ajaxify:history", ["detail"], function(url) {
        if (url in historyData) {
            switchContent(url, historyData[url]);
        } else {
            // TODO: need to trigger partial reload?
            location.reload();
        }
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

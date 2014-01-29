(function(DOM, location) {
    "use strict";

    DOM.ready(function() {
        var reAbsoluteUrl = /^.*\/\/[^\/]+/,
            // internal data structures
            historyData = {},
            currentTimestamp = Date.now(),
            currentLocation = location.href.replace(reAbsoluteUrl, "").split("#")[0],
            switchContent = function(response) {
                if (typeof response !== "object") return;

                var historyEntry = {html: {}, title: DOM.get("title"), url: currentLocation, ts: currentTimestamp};

                Object.keys(response.html).forEach(function(selector) {
                    var el = DOM.find(selector),
                        content = response.html[selector];

                    if (content != null) {
                        if (typeof content === "string") {
                            content = el.clone(false).set(content);
                        }
                        // can't use hide() here - animation quirks...
                        content.set("aria-hidden", "true");
                        // insert new response content
                        el[response.ts > currentTimestamp ? "before" : "after"](content);
                        // hide old content and remove when it's done
                        // have to call show() to fix animation quirks
                        el.hide(function() { el.remove().show() });
                        // show current content
                        content.show();
                        // store reference to node in memory
                        historyEntry.html[selector] = el;
                    }
                });
                // store previous state difference
                historyData[currentLocation] = historyEntry;
                // update current location variable
                currentLocation = response.url;
                currentTimestamp = response.ts;
                // update page title
                DOM.set("title", response.title);
            };

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
                                response = this.responseText,
                                doCallback;

                            // cleanup outer variables
                            if (callback === switchContent) lockedEl = null;

                            target.fire("ajaxify:loadend", this);

                            try {
                                response = JSON.parse(response);
                                // populate default values
                                response.url = (response.url || url).replace(reAbsoluteUrl, "");
                                response.title = response.title || DOM.get("title");
                                response.html = response.html || {};
                                response.ts = Date.now();
                            } catch (err) {
                                // response is a text content
                            } finally {
                                if (status >= 200 && status < 300 || status === 304) {
                                    doCallback = target.fire("ajaxify:load", response);
                                } else {
                                    doCallback = target.fire("ajaxify:error", this);
                                }

                                if (doCallback) callback(response);
                            }
                        }
                    };

                    return resultXHR;
                };

            return function(url, query, callback, target, currentTarget, cancel) {
                var len = arguments.length, xhr;

                if (len === 5) {
                    cancel = currentTarget;
                    currentTarget = target;
                    target = callback;

                    if (typeof query === "string") {
                        callback = switchContent;
                    } else {
                        callback = query;
                        query = null;
                    }
                } else if (len === 4) {
                    // url, target, cancel
                    cancel = target;
                    currentTarget = callback;
                    target = query;
                    callback = switchContent;
                    query = null;
                }

                if (len < 4 || typeof url !== "string") {
                    throw "URL value for ajaxify:fetch is not valid";
                }

                if (cancel || lockedEl === target && target !== DOM) return;

                url = url.replace("#/", "");

                if (query && Object.prototype.toString.call(query) === "[object Object]") {
                    query = Object.keys(query).reduce(function(memo, key) {
                        var name = encodeURIComponent(key),
                            value = query[key];

                        if (Array.isArray(value)) {
                            value.forEach(function(value) {
                                memo.push(name + "=" + encodeURIComponent(value));
                            });
                        } else {
                            memo.push(name + "=" + encodeURIComponent(value));
                        }

                        return memo;
                    }, []).join("&").replace(/%20/g, "+");
                }

                xhr = createXHR(target, url, callback);
                xhr.open(query ? "POST" : "GET", query ? url : (url + (~url.indexOf("?") ? "&" : "?") + new Date().getTime()), true);
                xhr.timeout = 15000;
                xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

                if (query) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                if (target.fire("ajaxify:loadstart", xhr)) xhr.send(query);
            };
        }()));

        DOM.find("meta[name=viewport]").each(function(el) {
            // http://updates.html5rocks.com/2013/12/300ms-tap-delay-gone-away
            if (~el.get("content").indexOf("width=device-width")) {
                // fastclick support via handling some events earlier
                DOM.on("touchend", function(el, currentTarget, cancel) {
                    if (cancel) return;

                    if (el.matches("a")) {
                        if (!el.get("target") && !el.get("href").indexOf("http")) {
                            el.fire("click");

                            return false;
                        }
                    } else if (el.matches("[type=submit]") && !el.get("disabled")) {
                        el.parent("form").fire("submit");

                        return false;
                    }
                });
            }
        });

        DOM.on({
            "click a": function(target, link, cancel) {
                if (!cancel && !link.get("target")) {
                    var url = link.get("href");

                    if (!url.indexOf("http")) return !link.fire("ajaxify:fetch", url);
                }
            },
            "submit": function(form, currentTarget, cancel) {
                if (!cancel && !form.get("target")) {
                    var url = form.get("action"),
                        query = form.toQueryString();

                    if (form.get("method") === "get") {
                        url += (~url.indexOf("?") ? "&" : "?") + query;
                        query = null;
                    }

                    return !form.fire("ajaxify:fetch", url, query);
                }
            },
            "ajaxify:history": function(url) {
                if (url in historyData) {
                    switchContent(historyData[url]);
                } else {
                    DOM.fire("ajaxify:fetch", url);
                }
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
                var name = el.get("name"),
                    fieldset = el.parent("fieldset");

                // don't include form fields without names
                // skip inner elements of a disabled fieldset
                if (name && !fieldset.get("disabled")) {
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

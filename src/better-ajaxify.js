(function(DOM, location) {
    "use strict";

    DOM.ready(function() {
        var // internal data structures
            historyData = {},
            currentLocation = location.href.split("#")[0],
            containers = DOM.findAll("[data-ajaxify]"),
            switchContent = (function() {
                return function(response) {
                    if (typeof response !== "object") return;

                    var cacheEntry = {html: {}, title: DOM.get("title"), url: currentLocation};

                    containers.each(function(el, index) {
                        var key = el.data("ajaxify"),
                            content = response.html[key];

                        if (content != null) {
                            if (typeof content === "string") {
                                content = el.clone(false).set(content);
                            }
                            // show/hide content async to display CSS3 animation
                            // removing element from DOM when animation ends
                            content.hide().show(10, function() { el.remove() });
                            el.before(content).hide(10);

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
            }()),
            handleLinkClick = function(link, cancel) {
                if (!cancel && !link.get("target")) {
                    var url = link.get("href");

                    if (!url.indexOf("http")) return !link.fire("ajaxify:fetch", url);
                }
            },
            handleFormSubmit = function(form, cancel) {
                if (!cancel && !form.get("target")) {
                    var url = form.get("action"),
                        query = form.toQueryString();

                    if (form.get("method") === "get") {
                        url += (~url.indexOf("?") ? "&" : "?") + query;
                        query = null;
                    }

                    return !form.fire("ajaxify:fetch", url, query);
                }
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
                                response.url = response.url || url;
                                response.title = response.title || DOM.get("title");
                                response.html = response.html || {};
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

            return function(url, query, callback, target, cancel) {
                var len = arguments.length, xhr;

                if (len === 4) {
                    cancel = target;
                    target = callback;

                    if (typeof query === "string") {
                        callback = switchContent;
                    } else {
                        callback = query;
                        query = null;
                    }
                } else if (len === 3) {
                    // url, target, cancel
                    cancel = callback;
                    target = query;
                    callback = switchContent;
                    query = null;
                }

                if (len < 3 || typeof url !== "string") {
                    throw "URL value for ajaxify:fetch is not valid";
                }

                if (cancel || lockedEl === target && target !== DOM) return;

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
                DOM.on("touchend", function(el, cancel) {
                    if (el.matches("a")) {
                        return handleLinkClick(el, cancel);
                    } else if (el.get("type") === "submit" && !el.get("disabled")) {
                        return handleFormSubmit(el.parent("form"), cancel);
                    }
                });
            }
        });

        DOM.on({
            "click a": handleLinkClick,
            "submit": handleFormSubmit,
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

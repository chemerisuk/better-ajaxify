(function(DOM, location, LINK_HANDLER, FORM_HANDLER, HISTORY_HANDLER, TIMEOUT_PROP) {
    "use strict";

    var stateHistory = {}, // in-memory storage for states
        currentState = {ts: Date.now(), url: location.href.split("#")[0]},
        switchContent = function(response) {
            if (typeof response !== "object" || typeof response.html !== "object") return;

            currentState.html = {};
            currentState.title = DOM.get("title");

            Object.keys(response.html).forEach(function(selector) {
                var el = DOM.find(selector),
                    content = response.html[selector];

                if (content != null) {
                    if (typeof content === "string") {
                        content = el.clone(false).set(content).hide();
                    }
                    // insert new response content
                    el[response.ts > currentState.ts ? "before" : "after"](content);
                    // hide old content and remove when it's done
                    el.hide(function() { el.remove() });
                    // show current content
                    content.show();
                    // store reference to node in memory
                    currentState.html[selector] = el;
                }
            });
            // store previous state difference
            stateHistory[currentState.url] = currentState;
            // update current state with the latest
            currentState = response;
            // update page title
            DOM.set("title", response.title);
        },
        makePair = function(name, value) {
            return encodeURIComponent(name) + "=" + encodeURIComponent(value);
        },
        createXHR = (function() {
            // lock element to prevent double clicks
            var lockedEl,
                sharedXHR = new XMLHttpRequest();

            return function(target, url, method, callback) {
                var resultXHR = sharedXHR;

                if (lockedEl === target && target !== DOM) return null;

                url = url.replace("#/", ""); // fix hanschange case urls

                if (callback === switchContent) {
                    // abort previous request if it's still in progress but
                    // skip cases when refresh was triggered programatically
                    sharedXHR.abort();

                    if (lockedEl) lockedEl.fire("ajaxify:abort", null, sharedXHR);

                    lockedEl = target;
                } else {
                    resultXHR = new XMLHttpRequest();
                }

                resultXHR.ontimeout = function() { target.fire("ajaxify:timeout", null, this) };
                resultXHR.onerror = function() { target.fire("ajaxify:error", null, this) };
                resultXHR.onreadystatechange = function() {
                    if (this.readyState === 4) {
                        var response = this.responseText;

                        // cleanup outer variables
                        if (callback === switchContent) lockedEl = null;

                        try {
                            response = JSON.parse(response);
                        } catch (err) {
                            // response is a text content
                            response = {html: response};
                        } finally {
                            // populate local values
                            response.url = response.url || url;
                            response.callback = callback;

                            target.fire("ajaxify:loadend", response, this);
                        }
                    }
                };

                resultXHR.open(method, url, true);
                resultXHR.timeout = DOM.get(TIMEOUT_PROP);
                resultXHR.setRequestHeader("X-Requested-With", "XMLHttpRequest");

                return resultXHR;
            };
        }());

    // TODO: drop "ajaxify:fetch", it's deprecated
    DOM.on(["ajaxify:get", "ajaxify:fetch"], function(url, callback, target) {
        if (typeof callback !== "function") {
            target = callback;
            callback = switchContent;
        }

        url = url + (~url.indexOf("?") ? "&" : "?") + Date.now();

        var xhr = createXHR(target, url, "GET", callback);

        if (xhr && target.fire("ajaxify:loadstart", xhr)) {
            xhr.send(null);
        }
    });

    DOM.on("ajaxify:post", function(url, query, callback, target) {
        if (Object.prototype.toString.call(query) === "[object Object]") {
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

        if (!query || typeof query === "string") {
            if (typeof callback !== "function") {
                target = callback;
                callback = switchContent;
            }
        } else if (typeof query === "function") {
            target = callback;
            callback = query;
            query = null;
        } else {
            target = query;
            callback = switchContent;
            query = null;
        }

        var xhr = createXHR(target, url, "POST", callback);

        if (xhr) {
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

            if (target.fire("ajaxify:loadstart", xhr)) xhr.send(query);
        }
    });

    // http://updates.html5rocks.com/2013/12/300ms-tap-delay-gone-away
    DOM.find("meta[name=viewport][content*='width=device-width']").each(function() {
        // fastclick support via handling some events earlier
        DOM.on("touchend a", function(_, el, cancel) {
            return !cancel || !el.fire("click");
        });

        DOM.on("touchend [type=submit]", function(_, el, cancel) {
            return !cancel || !el.parent("form").fire("submit");
        });
    });

    DOM.set(TIMEOUT_PROP, 15000);

    DOM
        .on("click a", LINK_HANDLER)
        .set(LINK_HANDLER, function(_, link, cancel) {
            if (!cancel && !link.get("target")) {
                var url = link.get("href");

                if (!url.indexOf("http")) {
                    return !link.fire("ajaxify:get", url);
                }
            }
        });

    DOM
        .on("submit", FORM_HANDLER)
        .set(FORM_HANDLER, function(form, _, cancel) {
            if (!cancel && !form.get("target")) {
                var url = form.get("action"),
                    query = form.toQueryString();

                if (form.get("method") === "get") {
                    return !form.fire("ajaxify:get", url + (~url.indexOf("?") ? "&" : "?") + query);
                } else {
                    return !form.fire("ajaxify:post", url, query);
                }
            }
        });

    DOM
        .on("ajaxify:history", HISTORY_HANDLER)
        .set(HISTORY_HANDLER, function(url) {
            if (url in stateHistory) {
                switchContent(stateHistory[url]);
            } else {
                DOM.fire("ajaxify:get", url);
            }
        });

    DOM.on("ajaxify:loadend", function(response, xhr, target, _, canceled) {
        var status = xhr.status,
            eventType;

        if (canceled) return false;

        // remove cache bursting parameter
        response.url = response.url.replace(/[&?]\d+/, "");
        // populate default values
        response.title = response.title || DOM.get("title");
        response.callback = response.callback || switchContent;
        response.ts = Date.now();

        if (status >= 200 && status < 300 || status === 304) {
            eventType = "ajaxify:load"; // success
        } else {
            eventType = "ajaxify:error"; // error
        }

        if (target.fire(eventType, response, xhr)) response.callback(response);
    });

    DOM.extend("form", {
        constructor: function() {
            var submits = this.findAll("[type=submit]");

            this.on("ajaxify:loadstart", function(xhr, target) {
                if (this === target) submits.set("disabled", true);
            });

            this.on(["ajaxify:load", "ajaxify:error", "ajaxify:abort", "ajaxify:timeout"], function(data, xhr, target) {
                if (this === target) submits.set("disabled", false);
            });
        },
        toQueryString: function() {
            return this.findAll("[name]").reduce(function(memo, el) {
                var name = el.get("name");
                // don't include disabled form fields or without names
                // skip inner form elements of a disabled fieldset
                if (name && !el.get("disabled") && !el.parent("fieldset").get("disabled")) {
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
}(window.DOM, location, "-ajaxify-handle-link", "-ajaxify-handle-form", "-ajaxify-handle-history", "-ajaxify-timeout"));

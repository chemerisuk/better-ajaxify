(function(DOM, XHR, location) {
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
        createXHR = (function() {
            // lock element to prevent double clicks
            var lockedEl;

            return function(target, method, url, config) {
                if (lockedEl === target) return null;

                if (target !== DOM) lockedEl = target;

                url = url.replace("#/", ""); // fix hanschange urls

                var complete = function(success) {
                    return function(response) {
                        // cleanup outer variables
                        if (target !== DOM) lockedEl = null;

                        if (typeof response === "string") {
                            // response is a text content
                            response = {html: response};
                        }

                        // populate local values
                        response.url = response.url || url;
                        response.title = response.title || DOM.get("title");

                        // remove cache bursting parameter
                        response.url = response.url.replace(/[&?]\d+/, "");
                        // add internal property
                        response.ts = Date.now();

                        return Promise[success ? "resolve" : "reject"](response);
                    };
                };

                return XHR(method, url, config).then(complete(true), complete(false));
            };
        }()),
        appendParam = function(memo, name, value) {
            if (name in memo) {
                if (Array.isArray(memo[name])) {
                    memo[name].push(value);
                } else {
                    memo[name] = [ memo[name], value ];
                }
            } else {
                memo[name] = value;
            }
        };

    ["get", "post"].forEach(function(method) {
        DOM.on("ajaxify:" + method, [1, 2, "target"], function(url, data, target) {
            var config = {data: data},
                complete = function(success) {
                    var eventType = success ? "ajaxify:load" : "ajaxify:error";

                    return function(response) {
                        if (target.fire("ajaxify:loadend", response) && target.fire(eventType, response)) {
                            switchContent(response);
                        }
                    };
                },
                xhr;

            if (target.fire("ajaxify:loadstart", config)) {
                xhr = createXHR(target, method, url, config);

                if (xhr) xhr.then(complete(true), complete(false));
            }
        });
    });

    DOM.on("click", "a", ["currentTarget", "defaultPrevented"], function(link, cancel) {
        if (cancel || link.get("target")) return;

        var url = link.get("href");

        if (!url.indexOf("http")) {
            return !link.fire("ajaxify:get", url);
        }
    });

    DOM.on("submit", ["target", "defaultPrevented"], function(form, cancel) {
        if (cancel || form.get("target")) return;

        var url = form.get("action"),
            method = form.get("method"),
            query = form.serialize();

        if (!method || method === "get") {
            return !form.fire("ajaxify:get", url, query);
        } else {
            return !form.fire("ajaxify:post", url, query);
        }
    });

    DOM.on("ajaxify:history", [1, "defaultPrevented"], function(url, cancel) {
        if (!url || cancel) return;

        if (url in stateHistory) {
            switchContent(stateHistory[url]);
        } else {
            DOM.fire("ajaxify:get", url);
        }
    });

    DOM.extend("form", {
        constructor: function() {
            var submits = this.findAll("[type=submit]");

            this.on("ajaxify:loadstart", ["target"], function(target) {
                if (this === target) {
                    submits.forEach(function(el) { el.set("disabled", true) });
                }
            });

            this.on("ajaxify:loadend", ["target"], function(target) {
                if (this === target) {
                    submits.forEach(function(el) { el.set("disabled", false) });
                }
            });
        },
        serialize: function() {
            var names = arguments.length ? Array.prototype.slice.call(arguments) : null;

            return this.findAll("[name]").reduce(function(memo, el) {
                var name = el.get("name");
                // don't include disabled form fields or without names
                if (name && !el.get("disabled")) {
                    // skip filtered names
                    if (names && names.indexOf(name) < 0) return memo;
                    // skip inner form elements of a disabled fieldset
                    if (el.closest("fieldset").get("disabled")) return memo;

                    switch(el.get("type")) {
                    case "select-one":
                    case "select-multiple":
                        el.children().forEach(function(option) {
                            if (option.get("selected")) {
                                appendParam(memo, name, option.get());
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
                        appendParam(memo, name, el.get());
                    }
                }

                return memo;
            }, {});
        }
    });
}(window.DOM, window.XHR, window.location));

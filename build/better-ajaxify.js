(function(DOM, XHR, location) {
    "use strict";

    var stateData = [], // in-memory storage for states
        currentState = {url: location.href.split("#")[0]},
        previousEls = [],
        switchContent = function(state, stateIndex)  {
            if (typeof state !== "object" || typeof state.html !== "object") return;

            currentState.html = {};
            currentState.title = DOM.get("title");
            // always make sure that previous state was completed
            // it can be in-progress on very fast history navigation
            previousEls.forEach(function(el)  {return el.remove()});

            var currentStateIndex = stateData.indexOf(currentState);

            if (currentStateIndex < 0) {
                // store the current state in memory
                currentStateIndex = stateData.push(currentState) - 1;
            }

            previousEls = Object.keys(state.html).map(function(selector)  {
                var el = DOM.find(selector),
                    content = state.html[selector];

                // store reference to node in the state object
                currentState.html[selector] = el;

                if (content != null) {
                    if (typeof content === "string") {
                        // clone el that is already in the hidden state
                        content = el.clone(false).set(content).hide();
                    }
                    // insert new state content
                    el[currentStateIndex > stateIndex ? "before" : "after"](content);
                    // show current content
                    content.show();
                }

                // Hide old content and remove when it's done. Use requestFrame
                // to postpone layout triggered by the remove method call
                el.hide(function()  {return DOM.requestFrame(function()  {return el.remove()})});

                return el;
            });
            // update current state to the latest
            currentState = state;
            // update page title
            DOM.set("title", state.title);
            // update url in address bar
            if (state.url !== location.href && stateIndex == null) {
                history.pushState(stateData.length, state.title, state.url);
            }
        },
        createXHR = (function() {
            // lock element to prevent double clicks
            var lockedEl;

            return function(target, method, url, config)  {
                if (lockedEl === target) return null;

                if (target !== DOM) lockedEl = target;

                var complete = function(defaultErrors)  {return function(state)  {
                    // cleanup outer variables
                    if (target !== DOM) lockedEl = null;

                    if (typeof state === "string") {
                        // state is a text content
                        state = {html: state};
                    }

                    // populate local values
                    state.url = state.url || url;
                    state.title = state.title || DOM.get("title");
                    state.errors = state.errors || defaultErrors;

                    return Promise[defaultErrors ? "reject" : "resolve"](state);
                }};

                return XHR(method, url, config).then(complete(false), complete(true));
            };
        }()),
        appendParam = function(memo, name, value)  {
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

    ["get", "post", "put", "delete", "patch"].forEach(function(method)  {
        DOM.on("ajaxify:" + method, [1, 2, "target"], function(url, data, target)  {
            if (typeof url !== "string") return;
            // disable cacheBurst that is not required for IE10+
            var config = {data: data, cacheBurst: false},
                submits = target.matches("form") ? target.findAll("[type=submit]") : [],
                complete = function(response)  {
                    submits.forEach(function(el)  {return el.set("disabled", false)});

                    target.fire("ajaxify:loadend", response);
                };

            if (target.fire("ajaxify:loadstart", config)) {
                submits.forEach(function(el)  {return el.set("disabled", true)});

                var xhr = createXHR(target, method, url, config);

                if (xhr) xhr.then(complete, complete);
            }
        });
    });

    DOM.on("click", "a", ["currentTarget", "defaultPrevented"], function(link, cancel)  {
        if (cancel || link.get("target")) return;

        var url = link.get("href").split("#")[0];
        // skip anchors and non-http(s) links
        if (!url.indexOf("http") && currentState.url.split("#")[0] !== url) {
            return !link.fire("ajaxify:get", url);
        }
    });

    DOM.on("submit", ["target", "defaultPrevented"], function(form, cancel)  {
        if (cancel || form.get("target")) return;

        var url = form.get("action"),
            method = form.get("method"),
            query = form.serialize();

        if (!method || method === "get") {
            return !form.fire("ajaxify:get", url, query);
        } else {
            return !form.fire("ajaxify:" + method, url, query);
        }
    });

    DOM.on("ajaxify:loadend", [1, "target", "defaultPrevented"], function(state, el, cancel)  {
        var eventType = "ajaxify:" + (state.errors ? "error" : "load");

        cancel = cancel || !el.fire(eventType, state);

        if (!cancel) switchContent(state);
    });

    DOM.on("ajaxify:history", [1, "defaultPrevented"], function(url, cancel)  {
        if (cancel) return;

        var stateIndex = +url,
            state = stateData[stateIndex];

        if (!state) {
            // traverse states in reverse order to access the newest first
            for (stateIndex = stateData.length; --stateIndex >= 0;) {
                state = stateData[stateIndex];

                if (state.url === url) break;
            }
        }

        if (stateIndex >= 0) {
            switchContent(state, stateIndex);
        } else {
            // if the state hasn't been found - fetch it manually
            DOM.fire("ajaxify:get", url);
        }
    });

    /* istanbul ignore else */
    if (history.pushState) {
        window.addEventListener("popstate", function(e)  {
            var stateIndex = e.state;

            if (typeof stateIndex === "number") {
                DOM.fire("ajaxify:history", stateIndex);
            }
        });
        // update initial state address url
        history.replaceState(0, DOM.get("title"));
        // fix bug with external pages
        window.addEventListener("beforeunload", function()  {
            history.replaceState(0, DOM.get("title"));
        });
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", ["target", "defaultPrevented"], function(sender, canceled)  {
            if (canceled) return;
            // load a new page in legacy browsers
            if (sender.matches("form")) {
                sender.fire("submit");
            } else if (sender.matches("a")) {
                location.href = sender.get("href");
            }
        });
    }

    DOM.extend("form", {
        serialize: function() {var SLICE$0 = Array.prototype.slice;var names = SLICE$0.call(arguments, 0);
            if (!names.length) names = false;

            return this.findAll("[name]").reduce(function(memo, el)  {
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
                        el.children().forEach(function(option)  {
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

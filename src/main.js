(function(DOM, XHR, location) {
    "use strict";

    var stateData = [], // in-memory storage for states
        currentState = {url: location.href.split("#")[0]},
        previousEls = [],
        switchContent = (state, stateIndex) => {
            if (typeof state !== "object" || typeof state.html !== "object" || state === currentState) return;

            currentState.html = {};
            currentState.title = DOM.get("title");
            // always make sure that previous state was completed
            // it can be in-progress on very fast history navigation
            previousEls.forEach((el) => el.remove());

            var currentStateIndex = stateData.indexOf(currentState);

            if (currentStateIndex < 0) {
                // store the current state in memory
                currentStateIndex = stateData.push(currentState) - 1;
            }

            previousEls = Object.keys(state.html).map((selector) => {
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
                    el[currentStateIndex > stateIndex ? "after" : "before"](content);
                    // show current content
                    content.show(() => {
                        // autofocus attribute support
                        content.find("[autofocus]").fire("focus");
                    });
                }

                // Hide old content and remove when it's done. Use requestFrame
                // to postpone layout triggered by the remove method call
                el.hide(() => DOM.requestFrame(() => el.remove()));

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

            return (target, method, url, config) => {
                if (lockedEl === target) return null;

                if (target !== DOM) lockedEl = target;

                var complete = (defaultErrors) => (state) => {
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
                };

                return XHR(method, url, config).then(complete(false), complete(true));
            };
        }()),
        appendParam = (memo, name, value) => {
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

    ["get", "post", "put", "delete", "patch"].forEach((method) => {
        DOM.on("ajaxify:" + method, [1, 2, "target"], (url, data, target) => {
            if (typeof url !== "string") return;
            // disable cacheBurst that is not required for IE10+
            var config = {data: data, cacheBurst: false},
                submits = target.matches("form") ? target.findAll("[type=submit]") : [],
                complete = (response) => {
                    submits.forEach((el) => el.set("disabled", false));

                    target.fire("ajaxify:loadend", response);
                };

            if (target.fire("ajaxify:loadstart", config)) {
                submits.forEach((el) => el.set("disabled", true));

                let xhr = createXHR(target, method, url, config);

                if (xhr) xhr.then(complete, complete);
            }
        });
    });

    DOM.on("click", "a", ["currentTarget", "defaultPrevented"], (link, cancel) => {
        if (!cancel && !link.get("target")) {
            var url = link.get("href");

            if (url === currentState.url) {
                setTimeout(() => {
                    link.fire("ajaxify:loadend", currentState);
                }, 0);
                // prevent default for links with the current url
                return false;
            } else if (!url.indexOf("http")) {
                var path = url.split("#")[0];

                if (path !== currentState.url.split("#")[0]) {
                    // skip anchors and non-http(s) links
                    return !link.fire("ajaxify:get", path);
                }
            }
        }
    });

    DOM.on("submit", ["target", "defaultPrevented"], (form, cancel) => {
        if (!cancel && !form.get("target")) {
            var url = form.get("action"),
                method = form.get("method") || "get";

            return !form.fire("ajaxify:" + method.toLowerCase(), url, form.serialize());
        }
    });

    DOM.on("ajaxify:loadend", [1, "target", "defaultPrevented"], (state, el, cancel) => {
        var eventType = "ajaxify:" + (state.errors ? "error" : "load");

        cancel = cancel || !el.fire(eventType, state);

        if (!cancel) switchContent(state);
    });

    DOM.on("ajaxify:history", [1, "defaultPrevented"], (url, cancel) => {
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
        window.addEventListener("popstate", (e) => {
            var stateIndex = e.state;

            if (typeof stateIndex === "number") {
                DOM.fire("ajaxify:history", stateIndex);
            }
        });
        // update initial state address url
        history.replaceState(0, DOM.get("title"));
        // fix bug with external pages
        window.addEventListener("beforeunload", () => {
            history.replaceState(0, DOM.get("title"));
        });
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", ["target", "defaultPrevented"], (sender, canceled) => {
            if (!canceled) {
                // trigger native element behavior in legacy browsers
                if (sender.matches("form")) {
                    sender[0].submit();
                } else if (sender.matches("a")) {
                    sender[0].click();
                }
            }
        });
    }

    DOM.extend("form", {
        serialize(...names) {
            return this.findAll("[name]").reduce((memo, el) => {
                var name = el.get("name");
                // don't include disabled form fields or without names
                if (name && !el.get("disabled")) {
                    // skip filtered names
                    if (names.length && names.indexOf(name) < 0) return memo;
                    // skip inner form elements of a disabled fieldset
                    if (el.closest("fieldset").get("disabled")) return memo;

                    switch(el.get("type")) {
                    case "select-one":
                    case "select-multiple":
                        el.children().forEach((option) => {
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

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
        promiseXHR = (function() {
            // lock element to prevent double clicks
            var lockedEl;

            return (target, method, url, config) => {
                if (lockedEl === target) {
                    return Promise.reject(null);
                }

                if (url === currentState.url && method === "get") {
                    return Promise.resolve(currentState);
                }

                if (target !== DOM) lockedEl = target;

                var xhr = XHR(method, url, config);
                var complete = (state) => {
                    // cleanup outer variables
                    if (target !== DOM) lockedEl = null;

                    if (state instanceof Error) {
                        // do nothing when request was failed
                        return Promise.reject(state);
                    }

                    if (typeof state === "string") {
                        // state is a text content
                        state = {html: {body: state}};
                    }

                    // populate default state values
                    state.url = state.url || url;
                    state.title = state.title || DOM.get("title");
                    state.status = xhr[0].status;
                    state.timestamp = Date.now();

                    return Promise.resolve(state);
                };
                // handle success and error responses both
                return xhr.then(complete, complete);
            };
        }());

    ["get", "post", "put", "delete", "patch"].forEach((method) => {
        DOM.on("ajaxify:" + method, [1, 2, "target"], (url, data, target) => {
            if (typeof url !== "string") return;
            // disable cacheBurst that is not required for IE10+
            var config = {data: data, cacheBurst: false},
                submits = target.matches("form") ? target.findAll("[type=submit]") : [];

            if (target.fire("ajaxify:send", config)) {
                submits.forEach((el) => { el.set("disabled", true) });

                promiseXHR(target, method, url, config).then((response) => {
                    submits.forEach((el) => { el.set("disabled", false) });

                    target.fire("ajaxify:change", response);
                }, (err) => {
                    target.fire("ajaxify:error", err);
                });
            }
        });
    });

    DOM.on("click", "a", ["currentTarget", "defaultPrevented"], (link, cancel) => {
        if (!cancel && !link.get("target")) {
            var url = link.get("href");
            var path = url.split("#")[0];
            // skip anchors and non-http(s) links
            if (url === currentState.url || !url.indexOf("http") &&
                path !== currentState.url.split("#")[0]) {
                return !link.fire("ajaxify:get", path);
            }
        }
    });

    DOM.on("submit", ["target", "defaultPrevented"], (form, cancel) => {
        if (!cancel && !form.get("target")) {
            var url = form.get("action"),
                method = form.get("method") || "get",
                data = XHR.serialize(form[0]);

            return !form.fire("ajaxify:" + method.toLowerCase(), url, data);
        }
    });

    DOM.on("ajaxify:change", [1, "target", "defaultPrevented"], (state, el, cancel) => {
        if (cancel || !state) return;

        var stateIndex = stateData.lastIndexOf(state);

        if (stateIndex >= 0) {
            switchContent(state, stateIndex);
        } else {
            setTimeout(() => {
                var responseStatus = state.status, eventType;

                if (responseStatus >= 200 && responseStatus < 300 || responseStatus === 304) {
                    eventType = "ajaxify:success";
                } else {
                    eventType = "ajaxify:error";
                }

                if (el.fire(eventType, state)) {
                    switchContent(state);
                }
            }, 0);
        }
    });

    /* istanbul ignore else */
    if (history.pushState) {
        window.addEventListener("popstate", (e) => {
            var stateIndex = e.state;
            // numeric value indicates better-ajaxify state
            if (typeof stateIndex === "number") {
                DOM.fire("ajaxify:change", stateData[stateIndex]);
            }
        });
        // update initial state address url
        history.replaceState(0, DOM.get("title"));
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:send", ["target", "defaultPrevented"], (sender, canceled) => {
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
}(window.DOM, window.XHR, window.location));

(function(DOM, XHR, location) {
    "use strict";

    var stateHistory = {}, // in-memory storage for states
        currentState = {ts: Date.now(), url: location.href.split("#")[0]},
        previousEls = [],
        switchContent = (response) => {
            if (typeof response !== "object" || typeof response.html !== "object") return;

            currentState.html = {};
            currentState.title = DOM.get("title");
            // always make sure that previous state was completed
            // it can be in-progress on very fast history navigation
            previousEls.forEach((el) => el.remove());

            previousEls = Object.keys(response.html).map((selector) => {
                var el = DOM.find(selector),
                    content = response.html[selector];

                // store reference to node in the state object
                currentState.html[selector] = el;

                if (content != null) {
                    if (typeof content === "string") {
                        // clone el that is already in the hidden state
                        content = el.clone(false).set(content).hide();
                    }
                    // insert new response content
                    el[response.ts > currentState.ts ? "before" : "after"](content);
                    // show current content
                    content.show();
                }

                // Hide old content and remove when it's done. Use requestFrame
                // to postpone layout triggered by the remove method call
                el.hide(() => DOM.requestFrame(() => el.remove()));

                return el;
            });
            // store previous state difference
            stateHistory[currentState.url] = currentState;
            // update current state with the latest
            currentState = response;
            // update page title
            DOM.set("title", response.title);
            // update url in address bar
            if (response.url !== location.href) {
                history.pushState(true, response.title, response.url);
            }
        },
        createXHR = (function() {
            // lock element to prevent double clicks
            var lockedEl;

            return (target, method, url, config) => {
                if (lockedEl === target) return null;

                if (target !== DOM) lockedEl = target;

                url = url.replace("#/", ""); // fix hanschange urls

                var complete = (success) => (response) => {
                    // cleanup outer variables
                    if (target !== DOM) lockedEl = null;

                    if (typeof response === "string") {
                        // response is a text content
                        response = {html: response};
                    }

                    // populate local values
                    response.url = response.url || url;
                    response.title = response.title || DOM.get("title");
                    // add internal property
                    response.ts = Date.now();

                    return Promise[success ? "resolve" : "reject"](response);
                };

                return XHR(method, url, config).then(complete(true), complete(false));
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
            // disable cacheBurst that is not required for IE10+
            var config = {data: data, cacheBurst: false},
                submits = target.matches("form") ? target.findAll("[type=submit]") : [],
                complete = (success) => {
                    var eventType = "ajaxify:" + (success ? "load" : "error");

                    return (response) => {
                        submits.forEach((el) => el.set("disabled", false));

                        if (target.fire("ajaxify:loadend", response) && target.fire(eventType, response)) {
                            switchContent(response);
                        }
                    };
                };

            if (target.fire("ajaxify:loadstart", config)) {
                submits.forEach((el) => el.set("disabled", true));

                let xhr = createXHR(target, method, url, config);

                if (xhr) xhr.then(complete(true), complete(false));
            }
        });
    });

    DOM.on("click", "a", ["currentTarget", "defaultPrevented"], (link, cancel) => {
        if (cancel || link.get("target")) return;

        var url = link.get("href");

        if (!url.indexOf("http")) {
            return !link.fire("ajaxify:get", url);
        }
    });

    DOM.on("submit", ["target", "defaultPrevented"], (form, cancel) => {
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

    DOM.on("ajaxify:history", [1, "defaultPrevented"], (url, cancel) => {
        if (!url || cancel) return;

        if (url in stateHistory) {
            switchContent(stateHistory[url]);
        } else {
            DOM.fire("ajaxify:get", url);
        }
    });

    /* istanbul ignore else */
    if (history.pushState) {
        window.addEventListener("popstate", (e) => {
            if (e.state) {
                DOM.fire("ajaxify:history", location.href);
            }
        });
        // update initial state address url
        history.replaceState(true, DOM.get("title"));
        // fix bug with external pages
        window.addEventListener("beforeunload", () => {
            history.replaceState(null, DOM.get("title"));
        });
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", ["target", "defaultPrevented"], (sender, canceled) => {
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
        serialize(...names) {
            if (!names.length) names = false;

            return this.findAll("[name]").reduce((memo, el) => {
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
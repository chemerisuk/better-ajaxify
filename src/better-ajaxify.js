(function(DOM, XHR, location) {
    "use strict";

    var stateHistory = {}, // in-memory storage for states
        currentState = {ts: Date.now(), url: location.href.split("#")[0]},
        switchContent = (response) => {
            if (typeof response !== "object" || typeof response.html !== "object") return;

            currentState.html = {};
            currentState.title = DOM.get("title");

            Object.keys(response.html).forEach((selector) => {
                var el = DOM.find(selector),
                    content = response.html[selector];

                if (content != null) {
                    if (typeof content === "string") {
                        content = el.clone(false).set(content).hide();
                    }
                    // insert new response content
                    el[response.ts > currentState.ts ? "before" : "after"](content);
                    // hide old content and remove when it's done
                    el.hide(() => { el.remove() });
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

            return (target, method, url, config) => {
                if (lockedEl === target) return null;

                if (target !== DOM) lockedEl = target;

                url = url.replace("#/", ""); // fix hanschange urls

                var cacheBurst = config.cacheBurst || XHR.defaults.cacheBurst;

                var complete = (success) => (response) => {
                    // cleanup outer variables
                    if (target !== DOM) lockedEl = null;

                    if (typeof response === "string") {
                        // response is a text content
                        response = {html: response};
                    }

                    // populate local values
                    response.url = response.url || url;
                    // remove cache bursting parameter
                    response.url = response.url.replace(cacheBurst + "=", "").replace(/[&?]\d+/, "");

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

    ["get", "post"].forEach((method) => {
        DOM.on("ajaxify:" + method, [1, 2, "target"], (url, data, target) => {
            var config = {data: data},
                complete = (success) => {
                    var eventType = success ? "ajaxify:load" : "ajaxify:error";

                    return (response) => {
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
            return !form.fire("ajaxify:post", url, query);
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
        constructor() {
            var submits = this.findAll("[type=submit]");

            this.on("ajaxify:loadstart", ["target"], (target) => {
                if (this === target) {
                    submits.forEach((el) => { el.set("disabled", true) });
                }
            });

            this.on("ajaxify:loadend", ["target"], (target) => {
                if (this === target) {
                    submits.forEach((el) => { el.set("disabled", false) });
                }
            });
        },
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

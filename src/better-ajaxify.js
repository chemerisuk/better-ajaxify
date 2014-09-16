(function(DOM, location, LINK_HANDLER, FORM_HANDLER, HISTORY_HANDLER) {
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
            var lockedEl;

            return function(target, method, url, config, callback) {
                if (lockedEl === target && target !== DOM) return null;

                url = url.replace("#/", ""); // fix hanschange case urls

                if (callback === switchContent) {
                    lockedEl = target;
                }

                var handleResponse = function(response) {
                    // cleanup outer variables
                    if (callback === switchContent) lockedEl = null;

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

                    return Promise.resolve(response);
                };

                return XHR(method, url, config).then(handleResponse, handleResponse);
            };
        }());

    DOM.on(["ajaxify:get", "ajaxify:post"], function(url, query, type, target) {
        var method = type.split(":").pop(),
            config = {data: query},
            xhr;

        if (target.fire("ajaxify:loadstart", config)) {
            xhr = createXHR(target, method, url, config, switchContent);

            if (xhr) {
                xhr.then(function(response) {
                    if (target.fire("ajaxify:loadend", response)) {
                        if (target.fire("ajaxify:load", response)) {
                            switchContent(response);
                        }
                    }
                }, function(response) {
                    if (target.fire("ajaxify:loadend", response)) {
                        if (target.fire("ajaxify:error", response)) {
                            switchContent(response);
                        }
                    }
                });
            }
        }
    }, ["type", "target"]);

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

    DOM
        .on("click a", LINK_HANDLER)
        .set(LINK_HANDLER, function(_, link, cancel) {
            if (!cancel && !link.get("target")) {
                var url = link.get("href");

                if (!url.indexOf("http")) {
                    return !link.fire("ajaxify:get", url, null);
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
                    return !form.fire("ajaxify:get", url, query);
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
                DOM.fire("ajaxify:get", url, null);
            }
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
}(window.DOM, location, "-ajaxify-handle-link", "-ajaxify-handle-form", "-ajaxify-handle-history"));

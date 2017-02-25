(function(document, location, history) {
    "use strict";
    // filter out old/buggy browsers
    if (!history.pushState || !("timeout" in XMLHttpRequest.prototype)) return;

    const states = []; // in-memory storage for states
    var currentState = {};

    function dispatchAjaxifyEvent(target, eventType, eventDetail) {
        const e = document.createEvent("CustomEvent");

        e.initCustomEvent("ajaxify:" + eventType, true, true, eventDetail || null);

        return target.dispatchEvent(e);
    }

    function updateCurrentState(target, title) {
        currentState.title = document.title;
        currentState.target = target;

        if (states.indexOf(currentState) < 0) {
            // if state does not exist - store it in memory
            states.push(currentState);
        }

        document.title = title;
    }

    document.addEventListener("click", function(e) {
        const el = e.target;

        if (!e.defaultPrevented) {
            var targetLink;

            if (el.nodeName.toLowerCase() === "a") {
                // detected click on a link
                targetLink = el;
            } else {
                const focusedElement = document.activeElement;

                if (focusedElement.nodeName.toLowerCase() === "a") {
                    if (focusedElement.contains(el)) {
                        // detected click on a link inner element
                        targetLink = focusedElement;
                    }
                }
            }

            if (targetLink && !targetLink.target) {
                // handle only http(s) links
                if (targetLink.protocol.slice(0, 4) === "http") {
                    const targetUrl = targetLink.href;
                    const currentUrl = location.href;

                    if (targetUrl === currentUrl || targetUrl.split("#")[0] !== currentUrl.split("#")[0]) {
                        if (dispatchAjaxifyEvent(targetLink, "fetch", targetLink.href)) {
                            // override default bahavior for links
                            e.preventDefault();
                        }
                    } else {
                        location.hash = targetLink.hash;
                        // override default bahavior for anchors
                        e.preventDefault();
                    }
                }
            }
        }
    }, false);

    document.addEventListener("submit", function(e) {
        const el = e.target;

        if (!e.defaultPrevented && !el.target) {
            if (dispatchAjaxifyEvent(el, "fetch", el.action)) {
                e.preventDefault();
            }
        }
    }, false);

    document.addEventListener("ajaxify:fetch", function(e) {
        if (!e.defaultPrevented) {
            const el = e.target;
            const xhr = new XMLHttpRequest();
            const method = (el.method || "get").toUpperCase();

            ["abort", "error", "load", "timeout"].forEach((type) => {
                xhr["on" + type] = () => {
                    dispatchAjaxifyEvent(el, type, xhr);
                };
            });

            xhr.open(method, e.detail, true);
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.responseType = "document";
            xhr.data = null;

            if (dispatchAjaxifyEvent(el, "send", xhr)) {
                xhr.send(xhr.data);
            }
        }
    }, false);

    document.addEventListener("ajaxify:load", function(e) {
        const xhr = e.detail;
        const res = xhr.response;
        const resBody = res.body;

        var target = document.body;
        var replacement = resBody;

        if (resBody.id) {
            target = document.getElementById(resBody.id);
            replacement = target.cloneNode(false);
            // move all elements to replacement
            for (var it; it = resBody.firstChild; ) {
                replacement.appendChild(it);
            }
        }

        if (dispatchAjaxifyEvent(target, "replace", replacement)) {
            const url = res.URL || xhr.responseURL;
            const title = res.title || document.title;

            updateCurrentState(target, title);

            if (url !== location.href) {
                history.pushState(states.length, title, url);
            }

            currentState = {}; // create a new state object
        }
    }, false);

    // default behavior for a content replacement
    document.addEventListener("ajaxify:replace", function(e) {
        if (!e.defaultPrevented) {
            const target = e.target;

            target.parentNode.replaceChild(e.detail, target);
        }
    }, false);

    window.addEventListener("popstate", function(e) {
        var stateIndex = e.state;
        // numeric value indicates better-ajaxify state
        if (stateIndex >= 0) {
            const state = states[stateIndex];
            const id = state.target.id;
            const target = id ? document.getElementById(id) : document.body;

            if (target && dispatchAjaxifyEvent(target, "replace", state.target)) {
                updateCurrentState(target, state.title);

                currentState = state;
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));

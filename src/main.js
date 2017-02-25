(function(document, location, history) {
    "use strict";

    if (!history.pushState) return; // skip unsupported browsers

    const states = []; // in-memory storage for states
    var currentState = {};

    function dispatchAjaxifyEvent(target, eventType, eventDetail) {
        const e = document.createEvent("CustomEvent");

        e.initCustomEvent("ajaxify:" + eventType, true, true, eventDetail || null);

        return target.dispatchEvent(e);
    }

    function updateCurrentState(target, selector, title) {
        currentState.title = document.title;
        currentState.target = target;
        currentState.selector = selector;

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
        const response = xhr.response;

        var target = document.body;
        var replacement = response.body;
        var selector = response.body.getAttribute("data-selector");

        if (!selector) {
            selector = "body";
        } else {
            target = document.querySelector(selector);
            replacement = target.cloneNode(false);
            // move all elements to replacement
            for (var it; it = response.body.firstChild; ) {
                replacement.appendChild(it);
            }
        }

        if (dispatchAjaxifyEvent(target, "replace", replacement)) {
            const url = response.URL || xhr.responseURL;
            const title = response.title || document.title;

            updateCurrentState(target, selector, title);

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
            const selector = state.selector;
            const target = document.querySelector(selector);

            if (target && dispatchAjaxifyEvent(target, "replace", state.target)) {
                updateCurrentState(target, selector, state.title);

                currentState = state;
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));

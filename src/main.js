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

    function sendAjaxRequest(target, method, url, data) {
        var xhr = new XMLHttpRequest();

        xhr.onabort = () => dispatchAjaxifyEvent(target, "abort", xhr);
        xhr.onerror = () => dispatchAjaxifyEvent(target, "error", xhr);
        xhr.onload = () => dispatchAjaxifyEvent(target, "load", xhr);

        xhr.open(method, url, true);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        if (dispatchAjaxifyEvent(target, "send", data)) {
            xhr.send(data);
        }
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
            const tagName = el.nodeName.toLowerCase();

            if (tagName === "a" && !el.target) {
                // skip non-http(s) links
                if (el.protocol.indexOf("http") === 0) {
                    if (dispatchAjaxifyEvent(el, "fetch")) {
                        e.preventDefault();
                    }
                }
            }

            // TODO: handle HTML elements inside of a link
        }
    }, false);

    document.addEventListener("ajaxify:fetch", function(e) {
        const el = e.target;
        const tagName = el.nodeName.toLowerCase();

        if (tagName === "a") {
            sendAjaxRequest(el, "get", el.href);
        }
    }, false);

    document.addEventListener("ajaxify:load", function(e) {
        const xhr = e.detail;
        const selector = xhr.getResponseHeader("X-Ajaxify-Selector") || "main";
        const target = document.querySelector(selector);

        if (target) {
            const targetClone = target.cloneNode(false);

            targetClone.innerHTML = xhr.responseText;

            if (dispatchAjaxifyEvent(target, "replace", targetClone)) {
                const url = xhr.getResponseHeader("X-Ajaxify-Url") || xhr.responseURL;
                const title = xhr.getResponseHeader("X-Ajaxify-Title") || document.title;

                updateCurrentState(target, selector, title);

                if (url !== location.href) {
                    history.pushState(states.length, title, url);
                }

                currentState = {}; // create a new state object
            }
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

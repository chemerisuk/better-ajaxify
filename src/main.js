(function(document, location, history) {
    "use strict";
    // filter out old/buggy browsers
    if (!history.pushState || !("timeout" in XMLHttpRequest.prototype)) return;

    const states = []; // in-memory storage for states
    var currentState = {};

    function attachNonPreventedListener(eventType, callback) {
        document.addEventListener(eventType, function(e) {
            if (!e.defaultPrevented) {
                callback(e);
            }
        }, false);
    }

    function dispatchAjaxifyEvent(el, eventType, eventDetail) {
        const e = document.createEvent("CustomEvent");

        e.initCustomEvent("ajaxify:" + eventType, true, true, eventDetail || null);

        return el.dispatchEvent(e);
    }

    function updateCurrentState(el, title) {
        currentState.el = el;
        currentState.title = document.title;

        if (states.indexOf(currentState) < 0) {
            // if state does not exist - store it in memory
            states.push(currentState);
        }

        document.title = title;
    }

    attachNonPreventedListener("click", (e) => {
        const el = e.target;

        var link;

        if (el.nodeName.toLowerCase() === "a") {
            // detected click on a link
            link = el;
        } else {
            const focusedElement = document.activeElement;

            if (focusedElement.nodeName.toLowerCase() === "a") {
                if (focusedElement.contains(el)) {
                    // detected click on a link inner element
                    link = focusedElement;
                }
            }
        }

        if (link && !link.target) {
            // handle only http(s) links
            if (link.protocol.slice(0, 4) === "http") {
                const targetUrl = link.href;
                const currentUrl = location.href;

                if (targetUrl === currentUrl || targetUrl.split("#")[0] !== currentUrl.split("#")[0]) {
                    if (dispatchAjaxifyEvent(link, "fetch", link.href)) {
                        // override default bahavior for links
                        e.preventDefault();
                    }
                } else {
                    location.hash = link.hash;
                    // override default bahavior for anchors
                    e.preventDefault();
                }
            }
        }
    });

    attachNonPreventedListener("submit", (e) => {
        const el = e.target;

        if (!el.target) {
            if (dispatchAjaxifyEvent(el, "fetch", el.action)) {
                e.preventDefault();
            }
        }
    });

    attachNonPreventedListener("ajaxify:fetch", (e) => {
        const el = e.target;
        const xhr = new XMLHttpRequest();

        ["abort", "error", "load", "timeout"].forEach((type) => {
            xhr["on" + type] = () => {
                dispatchAjaxifyEvent(el, type, xhr);
            };
        });

        xhr.open((el.method || "get").toUpperCase(), e.detail, true);
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.responseType = "document";
        xhr.data = null;

        if (dispatchAjaxifyEvent(el, "send", xhr)) {
            xhr.send(xhr.data);
        }
    });

    attachNonPreventedListener("ajaxify:load", (e) => {
        const xhr = e.detail;
        const res = xhr.response;
        const resBody = res.body;

        var el = document.body;
        var replacement = resBody;

        if (resBody.id) {
            el = document.getElementById(resBody.id);
            replacement = el.cloneNode(false);
            // move all elements to replacement
            for (var node; node = resBody.firstChild; ) {
                replacement.appendChild(node);
            }
        }

        dispatchAjaxifyEvent(el, "replace", replacement);

        const url = res.URL || xhr.responseURL;
        const title = res.title || document.title;

        updateCurrentState(el, title);

        if (url !== location.href) {
            history.pushState(states.length, title, url);
        }

        currentState = {}; // create a new state object
    });

    // default behavior for a content replacement
    attachNonPreventedListener("ajaxify:replace", (e) => {
        const el = e.target;

        el.parentNode.replaceChild(e.detail, el);
    });

    window.addEventListener("popstate", (e) => {
        var stateIndex = e.state;
        // numeric value indicates better-ajaxify state
        if (stateIndex >= 0) {
            const state = states[stateIndex];
            const id = state.el.id;
            const el = id ? document.getElementById(id) : document.body;

            if (el) {
                dispatchAjaxifyEvent(el, "replace", state.el);

                updateCurrentState(el, state.title);

                currentState = state;
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));

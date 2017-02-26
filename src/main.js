(function(document, location, history) { /* jshint maxdepth:7, boss:true */
    "use strict";
    // filter out old/buggy browsers
    if (!history.pushState || !("timeout" in XMLHttpRequest.prototype)) return;

    const states = []; // in-memory storage for states
    var currentState = {};
    var lastFormData = null;

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
            var url = el.action;

            if (el.enctype === "multipart/form-data") {
                lastFormData = new FormData(el);
            } else {
                const qs = [];

                for (var i = 0, field; field = el.elements[i]; ++i) {
                    if (field.name && !field.disabled) {
                        const fieldType = field.type;
                        const fieldName = encodeURIComponent(field.name);

                        if (fieldType === "select-multiple") {
                            for (var j = 0, option; option = field.options[j]; ++j) {
                                if (option.selected) {
                                    qs.push(fieldName + "=" + encodeURIComponent(option.value));
                                }
                            }
                        } else if ((fieldType !== "checkbox" && fieldType !== "radio") || field.checked) {
                            qs.push(fieldName + "=" + encodeURIComponent(field.value));
                        }
                    }
                }

                if (qs.length) {
                    lastFormData = qs.join("&").replace(/%20/g, "+");

                    if (!el.method || el.method.toUpperCase() === "GET") {
                        url += (~url.indexOf("?") ? "&" : "?") + lastFormData;

                        lastFormData = null; // don't send data for GET forms
                    }
                }
            }

            if (dispatchAjaxifyEvent(el, "fetch", url)) {
                e.preventDefault();
            }

            lastFormData = null; // cleanup internal reference
        }
    });

    attachNonPreventedListener("ajaxify:fetch", (e) => {
        const el = e.target;
        const xhr = new XMLHttpRequest();
        const method = (el.method || "GET").toUpperCase();

        ["abort", "error", "load", "timeout"].forEach((type) => {
            xhr["on" + type] = () => {
                dispatchAjaxifyEvent(el, type, xhr);
            };
        });

        xhr.open(method, e.detail, true);
        xhr.responseType = "document";
        xhr.data = lastFormData;

        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

        if (method !== "GET") {
            xhr.setRequestHeader("Content-Type", el.enctype);
        }

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

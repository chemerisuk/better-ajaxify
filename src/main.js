(function(document, location, history) { /* jshint maxdepth:8, boss:true */
    "use strict";

    // do not enable the plugin for old browsers BUT keep for jasmine
    if (!history.pushState || !("timeout" in XMLHttpRequest.prototype || window.jasmine)) return;

    const identity = (s) => s;
    const states = []; // in-memory storage for states
    var lastState = {};
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

    function updateCurrentState(el, title, content) {
        if (dispatchAjaxifyEvent(el, "update", content)) {
            el.parentNode.replaceChild(content, el);
        }

        lastState.body = el;
        lastState.title = document.title;

        if (states.indexOf(lastState) < 0) {
            // if state does not exist - store it in memory
            states.push(lastState);
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
            if (link.getAttribute("aria-disabled") === "true") {
                e.preventDefault();
            } else if (link.protocol.slice(0, 4) === "http") {
                // handle only http(s) links
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
            if (el.getAttribute("aria-disabled") === "true") {
                e.preventDefault();
            } else {
                const formEnctype = el.enctype;

                var url = el.action;

                if (formEnctype === "multipart/form-data") {
                    lastFormData = new FormData(el);
                } else {
                    const encode = formEnctype === "text/plain" ? identity : encodeURIComponent;
                    const qs = [];

                    for (var i = 0, field; field = el.elements[i]; ++i) {
                        if (field.name && !field.disabled) {
                            const fieldType = field.type;
                            const fieldName = encode(field.name);

                            if (fieldType === "select-multiple") {
                                for (var j = 0, option; option = field.options[j]; ++j) {
                                    if (option.selected) {
                                        qs.push(fieldName + "=" + encode(option.value));
                                    }
                                }
                            } else if ((fieldType !== "checkbox" && fieldType !== "radio") || field.checked) {
                                qs.push(fieldName + "=" + encode(field.value));
                            }
                        }
                    }

                    if (qs.length) {
                        lastFormData = qs.join("&").split(formEnctype === "text/plain" ? " " : "%20").join("+");

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
        }
    });

    attachNonPreventedListener("ajaxify:fetch", (e) => {
        const el = e.target;
        const xhr = new XMLHttpRequest();
        const method = (el.method || "GET").toUpperCase();

        ["abort", "error", "load", "timeout"].forEach((type) => {
            xhr["on" + type] = () => {
                if (el.nodeType === 1) {
                    el.setAttribute("aria-disabled", "false");
                }

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
            if (el.nodeType === 1) {
                el.setAttribute("aria-disabled", "true");
            }

            xhr.send(xhr.data);
        }
    });

    attachNonPreventedListener("ajaxify:load", (e) => {
        const xhr = e.detail;
        const res = xhr.response;

        var el = document.body;
        var content = res.body;

        if (content.getAttribute("role") === "main") {
            el = document.querySelector("main,[role=main]");
            content = el.cloneNode(false);
            // move all elements to replacement
            for (var node; node = res.body.firstChild; ) {
                content.appendChild(node);
            }
        }

        const url = xhr.responseURL || xhr.getResponseHeader("Location");
        const title = res.title;

        updateCurrentState(el, title, content);

        lastState = {}; // create a new state object

        if (url !== location.href) {
            history.pushState(states.length, title, url);
        }
    });

    window.addEventListener("popstate", (e) => {
        // numeric value indicates better-ajaxify state
        if (!e.defaultPrevented && e.state >= 0) {
            const state = states[e.state];

            if (state) {
                var el = document.body;

                if (state.body.nodeName.toLowerCase() !== "body") {
                    el = document.querySelector("main,[role=main]");
                }

                if (el) {
                    updateCurrentState(el, state.title, state.body);

                    lastState = state;
                }
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));

(function(document, location, history) { /* jshint maxdepth:8, boss:true */
    "use strict";

    // do not enable the plugin for old browsers BUT keep for jasmine
    if (!history.pushState || !("timeout" in XMLHttpRequest.prototype || window.jasmine)) return;

    const identity = (s) => s;
    const states = []; // in-memory storage for states
    var lastState = {}, lastFormData;

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
                    if (dispatchAjaxifyEvent(link, "fetch")) {
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
                const formEnctype = el.getAttribute("enctype");

                var data;

                if (formEnctype === "multipart/form-data") {
                    data = new FormData(el);
                } else {
                    data = {};

                    for (var i = 0, field; field = el.elements[i]; ++i) {
                        const fieldType = field.type;

                        if (fieldType && field.name && !field.disabled) {
                            const fieldName = field.name;

                            if (fieldType === "select-multiple") {
                                for (var j = 0, option; option = field.options[j]; ++j) {
                                    if (option.selected) {
                                        (data[fieldName] = data[fieldName] || []).push(option.value);
                                    }
                                }
                            } else if ((fieldType !== "checkbox" && fieldType !== "radio") || field.checked) {
                                data[fieldName] = field.value;
                            }
                        }
                    }
                }

                if (dispatchAjaxifyEvent(el, "serialize", data)) {
                    if (data instanceof FormData) {
                        lastFormData = data;
                    } else {
                        const encode = formEnctype === "text/plain" ? identity : encodeURIComponent;
                        const reSpace = encode === identity ? / /g : /%20/g;

                        lastFormData = Object.keys(data).map((key) => {
                            const name = encode(key);
                            var value = data[key];

                            if (Array.isArray(value)) {
                                value = value.map(encode).join("&" + name + "=");
                            }

                            return name + "=" + encode(value);
                        }).join("&").replace(reSpace, "+");
                    }

                    if (dispatchAjaxifyEvent(el, "fetch")) {
                        e.preventDefault();
                    }

                    lastFormData = null; // cleanup internal reference
                }
            }
        }
    });

    attachNonPreventedListener("ajaxify:fetch", (e) => {
        const el = e.target;
        const xhr = new XMLHttpRequest();
        const method = (el.method || "GET").toUpperCase();
        const nodeName = el.nodeName.toLowerCase();

        var url = e.detail;

        if (nodeName === "a") {
            url = url || el.href;
        } else if (nodeName === "form") {
            url = url || el.action;

            if (method === "GET") {
                url += (~url.indexOf("?") ? "&" : "?") + lastFormData;
                // for get forms append all data to url
                lastFormData = null;
            }
        }

        ["abort", "error", "load", "timeout"].forEach((type) => {
            xhr["on" + type] = () => {
                if (el.nodeType === 1) {
                    el.removeAttribute("aria-disabled");
                }

                dispatchAjaxifyEvent(el, type, xhr);
            };
        });

        xhr.open(method, url, true);
        xhr.responseType = "document";

        if (dispatchAjaxifyEvent(el, "send", xhr)) {
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

            if (method !== "GET") {
                xhr.setRequestHeader("Content-Type", el.getAttribute("enctype") || el.enctype);
            }

            xhr.send(lastFormData);

            if (el.nodeType === 1) {
                el.setAttribute("aria-disabled", "true");
            }
        }
    });

    attachNonPreventedListener("ajaxify:load", (e) => {
        const xhr = e.detail;
        const res = xhr.response;
        const status = xhr.status;
        const title = res.title;

        var target = document.body;
        var content = res.body;
        // replace content of the main element
        // only for successful responses
        if (status >= 200 && status < 300 || status === 304) {
            target = document.querySelector("main,[role=main]");
            content = target.cloneNode(false);
            // move all elements to replacement
            for (var node; node = res.body.firstChild; ) {
                content.appendChild(node);
            }
        }

        var url = xhr.responseURL;

        if (!url) {
            url = xhr.getResponseHeader("Location");

            if (url) {
                url = res.URL.split("/").slice(0, 3).join("/") + url;
            } else {
                url = res.URL;
            }
            // polyfill xhr.responseURL
            Object.defineProperty(xhr, "responseURL", {get: () => url});
        }

        updateCurrentState(target, title, content);

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
                var target = document.body;

                if (state.body.nodeName.toLowerCase() !== "body") {
                    target = document.querySelector("main,[role=main]");
                }

                if (target) {
                    updateCurrentState(target, state.title, state.body);

                    lastState = state;
                }
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));

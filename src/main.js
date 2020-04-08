(function(document, location, history) { /* jshint maxdepth:8, boss:true */
    "use strict";

    // do not enable the plugin for old browsers
    if (typeof history.pushState !== "function") return;

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

    function dispatchAjaxifyEvent(el, type, detail) {
        const e = document.createEvent("CustomEvent");
        e.initCustomEvent("ajaxify:" + type, true, true, detail || null);
        return el.dispatchEvent(e);
    }

    attachNonPreventedListener("click", (e) => {
        const body = document.body;

        for (var el = e.target; el && el !== body; el = el.parentNode) {
            if (el.nodeName.toLowerCase() === "a") {
                if (!el.target) {
                    const targetUrl = el.href;

                    if (targetUrl && targetUrl.indexOf("http") === 0) {
                        const currentUrl = location.href;

                        if (targetUrl === currentUrl || targetUrl.split("#")[0] !== currentUrl.split("#")[0]) {
                            if (dispatchAjaxifyEvent(el, "fetch")) {
                                // override default bahavior for links
                                e.preventDefault();
                            }
                        } else {
                            location.hash = el.hash;
                            // override default bahavior for anchors
                            e.preventDefault();
                        }
                    }
                }

                break;
            }
        }
    });

    attachNonPreventedListener("submit", (e) => {
        const el = e.target;

        if (!el.target) {
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

            if (!dispatchAjaxifyEvent(el, "serialize", data)) {
                e.preventDefault();
            } else {
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
    });

    // register global listener to allow triggering http requests in JS
    attachNonPreventedListener("ajaxify:fetch", (e) => {
        const el = e.target;
        const method = (el.method || "GET").toUpperCase();
        const nodeName = el.nodeName.toLowerCase();

        let url = e.detail;
        if (nodeName === "a") {
            url = url || el.href;
        } else if (nodeName === "form") {
            url = url || el.action;

            if (method === "GET" && lastFormData) {
                url += (~url.indexOf("?") ? "&" : "?") + lastFormData;
                // for get forms append all data to url
                lastFormData = null;
            }
        }

        const xhr = new XMLHttpRequest();

        ["abort", "error", "load", "timeout"].forEach((type) => {
            xhr["on" + type] = () => {
                const res = xhr.response;
                var url = xhr.responseURL;
                // polyfill xhr.responseURL value
                if (!url && res && res.URL) {
                    url = xhr.getResponseHeader("Location");

                    if (url) {
                        const responseURL = location.origin + url;
                        // patch XHR object to set responseURL
                        Object.defineProperty(xhr, "responseURL", {get: () => responseURL});
                    }
                }

                if (dispatchAjaxifyEvent(el, type, xhr) && type === "load") {
                    const defaultTitle = xhr.status + " " + xhr.statusText;
                    const doc = res || document.implementation.createHTMLDocument(defaultTitle);

                    dispatchAjaxifyEvent(document, "navigate", doc);
                }
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
        }
    });

    // register global listener to allow navigation changes in JS
    attachNonPreventedListener("ajaxify:navigate", (e) => {
        const detail = e.detail;

        // TODO: allow detail to be a string?

        lastState.body = document.body;
        lastState.title = document.title;
        if (states.indexOf(lastState) < 0) {
            // if state does not exist - store it in memory
            states.push(lastState);
        }
        lastState = detail.nodeType ? {} : detail;

        if (dispatchAjaxifyEvent(document, "swap", detail.body)) {
            // by default just swap elements
            document.documentElement.replaceChild(detail.body, document.body);
        }

        if (detail.URL && detail.URL !== location.href) {
            history.pushState(states.length, detail.title, detail.URL);
        }
        document.title = detail.title;
    });

    window.addEventListener("popstate", (e) => {
        // numeric value indicates better-ajaxify state
        if (!e.defaultPrevented && e.state >= 0) {
            const state = states[e.state];
            if (state) {
                dispatchAjaxifyEvent(document, "navigate", state);
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));

(function(document, location, history) { /* jshint maxdepth:8, boss:true */
    "use strict";

    // do not enable the plugin for old browsers BUT keep for jasmine
    if (!history.pushState || !("timeout" in XMLHttpRequest.prototype || window.jasmine)) return;

    const identity = (s) => s;
    const reTitle = /<title>(.*?)<\/title>/;
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

    function updateState(state, detail) {
        const body = document.body;

        if (dispatchAjaxifyEvent(body, "update", detail)) {
            // by default just swap body elements
            body.parentNode.replaceChild(state.body, body);
        }

        if (states.indexOf(lastState) < 0) {
            // if state does not exist - store it in memory
            states.push(lastState);
        }

        document.title = state.title;
    }

    attachNonPreventedListener("click", (e) => {
        const body = document.body;

        for (var el = e.target; el !== body; el = el.parentNode) {
            if (el.nodeName.toLowerCase() === "a") {
                if (!el.target) {
                    if (el.getAttribute("aria-disabled") === "true") {
                        e.preventDefault();
                    } else if (el.protocol.slice(0, 4) === "http") {
                        // handle only http(s) links
                        var targetUrl = el.href;
                        var currentUrl = location.href;

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

            if (method === "GET" && lastFormData) {
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

        // for error response always set responseType to "text"
        // otherwise browser blocks access to xhr.responseText
        xhr.onreadystatechange = function() {
            const status = xhr.status;
            // http://stackoverflow.com/questions/29023509/handling-error-messages-when-retrieving-a-blob-via-ajax
            if (xhr.readyState === 2) {
                if (status !== 304 && (status < 200 || status > 300)) {
                    xhr.responseType = "text";
                }
            }
        };

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

    document.addEventListener("ajaxify:load", function(e) {
        const xhr = e.detail;
        const res = xhr.response;

        var url = xhr.responseURL;
        // polyfill xhr.responseURL value
        if (!url && res && res.URL) {
            url = xhr.getResponseHeader("Location");

            if (url) {
                url = res.URL.split("/").slice(0, 3).join("/") + url;
            } else {
                url = res.URL;
            }

            Object.defineProperty(xhr, "responseURL", {get: () => url});
        }
    }, true);

    attachNonPreventedListener("ajaxify:load", (e) => {
        const xhr = e.detail;
        const res = xhr.response;
        const state = {};

        if (res.body) {
            state.body = res.body;
            state.title = res.title;
        } else {
            state.body = res;
            state.title = xhr.status + " " + xhr.statusText;
        }

        updateState(state, xhr.response);

        lastState = {}; // create a new state object

        var url = xhr.responseURL;

        if (url !== location.href) {
            history.pushState(states.length, state.title, url);
        }
    });

    document.addEventListener("ajaxify:update", function(e) {
        const detail = e.detail;
        // override string e.detail
        if (typeof detail === "string") {
            const titleMatch = reTitle.exec(detail);
            const doc = document.implementation.createHTMLDocument(titleMatch && titleMatch[1] || "");

            doc.body.innerHTML = detail.trim().replace(titleMatch && titleMatch[0], "");

            Object.defineProperty(e, "detail", {get: () => doc});
        }

        lastState.body = e.target;
        lastState.title = document.title;
    }, true);

    window.addEventListener("popstate", (e) => {
        // numeric value indicates better-ajaxify state
        if (!e.defaultPrevented && e.state >= 0) {
            const state = states[e.state];

            if (state) {
                updateState(state, state.body);

                lastState = state;
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window.document, window.location, window.history));

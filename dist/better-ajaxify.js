/**
 * better-ajaxify: Ajax website engine for better-dom
 * @version 2.0.0-rc.3 Fri, 12 May 2017 08:28:50 GMT
 * @link https://github.com/chemerisuk/better-ajaxify
 * @copyright 2017 Maksim Chemerisuk
 * @license MIT
 */
(function (document, location, history) {
    /* jshint maxdepth:8, boss:true */
    "use strict";

    // do not enable the plugin for old browsers

    if (typeof history.pushState !== "function") return;

    var identity = function (s) {
        return s;
    };
    var reTitle = /<title>(.*?)<\/title>/;
    var states = []; // in-memory storage for states
    var lastState = {},
        lastFormData;

    function attachNonPreventedListener(eventType, callback) {
        document.addEventListener(eventType, function (e) {
            if (!e.defaultPrevented) {
                callback(e);
            }
        }, false);
    }

    function attachCapturingListener(eventType, callback) {
        document.addEventListener(eventType, callback, true);
    }

    function dispatchAjaxifyEvent(el, eventType, eventDetail) {
        var e = document.createEvent("CustomEvent");

        e.initCustomEvent("ajaxify:" + eventType, true, true, eventDetail || null);

        return el.dispatchEvent(e);
    }

    function updateState(state, detail) {
        var body = document.body;

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

    function createDocument(htmlText) {
        var titleMatch = reTitle.exec(htmlText);
        var doc = document.implementation.createHTMLDocument(titleMatch && titleMatch[1] || "");

        doc.body.innerHTML = htmlText.trim().replace(titleMatch && titleMatch[0], "");

        return doc;
    }

    attachNonPreventedListener("click", function (e) {
        var body = document.body;

        for (var el = e.target; el && el !== body; el = el.parentNode) {
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

    attachNonPreventedListener("submit", function (e) {
        var el = e.target;

        if (!el.target) {
            if (el.getAttribute("aria-disabled") === "true") {
                e.preventDefault();
            } else {
                var formEnctype = el.getAttribute("enctype");

                var data;

                if (formEnctype === "multipart/form-data") {
                    data = new FormData(el);
                } else {
                    data = {};

                    for (var i = 0, field; field = el.elements[i]; ++i) {
                        var fieldType = field.type;

                        if (fieldType && field.name && !field.disabled) {
                            var fieldName = field.name;

                            if (fieldType === "select-multiple") {
                                for (var j = 0, option; option = field.options[j]; ++j) {
                                    if (option.selected) {
                                        (data[fieldName] = data[fieldName] || []).push(option.value);
                                    }
                                }
                            } else if (fieldType !== "checkbox" && fieldType !== "radio" || field.checked) {
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
                        var encode = formEnctype === "text/plain" ? identity : encodeURIComponent;
                        var reSpace = encode === identity ? / /g : /%20/g;

                        lastFormData = Object.keys(data).map(function (key) {
                            var name = encode(key);
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

    attachNonPreventedListener("ajaxify:fetch", function (e) {
        var el = e.target;
        var xhr = new XMLHttpRequest();
        var method = (el.method || "GET").toUpperCase();
        var nodeName = el.nodeName.toLowerCase();
        var nodeType = el.nodeType;

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

        ["abort", "error", "load", "timeout"].forEach(function (type) {
            xhr["on" + type] = function () {
                if (nodeType === 1) {
                    el.removeAttribute("aria-disabled");
                }

                dispatchAjaxifyEvent(el, type, xhr);
            };
        });

        xhr.open(method, url, true);

        if (dispatchAjaxifyEvent(el, "send", xhr)) {
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

            if (method !== "GET") {
                xhr.setRequestHeader("Content-Type", el.getAttribute("enctype") || el.enctype);
            }

            xhr.send(lastFormData);

            if (nodeType === 1) {
                el.setAttribute("aria-disabled", "true");
            }
        }
    });

    attachCapturingListener("ajaxify:load", function (e) {
        var xhr = e.detail;
        var res = xhr.response;

        var url = xhr.responseURL;
        // polyfill xhr.responseURL value
        if (!url && res && res.URL) {
            url = xhr.getResponseHeader("Location");

            if (url) {
                url = location.origin + url;

                Object.defineProperty(xhr, "responseURL", { get: function () {
                        return url;
                    } });
            }
        }
    });

    attachNonPreventedListener("ajaxify:load", function (e) {
        var xhr = e.detail;
        var detail = createDocument(xhr.responseText);
        var state = { body: detail.body };

        if (detail.title) {
            state.title = detail.title;
        } else {
            state.title = xhr.status + " " + xhr.statusText;
        }

        updateState(state, detail);

        lastState = {}; // create a new state object

        var url = xhr.responseURL;

        if (url !== location.href) {
            history.pushState(states.length, state.title, url);
        }
    });

    attachCapturingListener("ajaxify:update", function (e) {
        var detail = e.detail;

        if (typeof detail === "string") {
            detail = createDocument(detail);
            // override property e.detail
            Object.defineProperty(e, "detail", { get: function () {
                    return detail;
                } });
        }

        lastState.body = e.target;
        lastState.title = document.title;
    });

    window.addEventListener("popstate", function (e) {
        // numeric value indicates better-ajaxify state
        if (!e.defaultPrevented && e.state >= 0) {
            var state = states[e.state];

            if (state) {
                updateState(state, state.body);

                lastState = state;
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);
})(window.document, window.location, window.history);
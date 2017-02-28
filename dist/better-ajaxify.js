/**
 * better-ajaxify: Ajax website engine for better-dom
 * @version 2.0.0-beta.1 Tue, 28 Feb 2017 18:39:00 GMT
 * @link https://github.com/chemerisuk/better-ajaxify
 * @copyright 2017 Maksim Chemerisuk
 * @license MIT
 */
(function (document, location, history, AJAXIFY_TARGET) {
    /* jshint maxdepth:8, boss:true */
    "use strict";

    // do not enable the plugin for old browsers BUT keep for jasmine

    if (!history.pushState || !("timeout" in XMLHttpRequest.prototype || window.jasmine)) return;

    var identity = function (s) {
        return s;
    };
    var states = []; // in-memory storage for states
    var lastState = {};
    var lastFormData = null;

    function attachNonPreventedListener(eventType, callback) {
        document.addEventListener(eventType, function (e) {
            if (!e.defaultPrevented) {
                callback(e);
            }
        }, false);
    }

    function dispatchAjaxifyEvent(el, eventType, eventDetail) {
        var e = document.createEvent("CustomEvent");

        e.initCustomEvent("ajaxify:" + eventType, true, true, eventDetail || null);

        return el.dispatchEvent(e);
    }

    function updateCurrentState(el, title, content) {
        if (dispatchAjaxifyEvent(el, "update", content)) {
            el.parentNode.replaceChild(content, el);
        }

        lastState.el = el;
        lastState.title = document.title;

        if (states.indexOf(lastState) < 0) {
            // if state does not exist - store it in memory
            states.push(lastState);
        }

        document.title = title;
    }

    attachNonPreventedListener("click", function (e) {
        var el = e.target;

        var link;

        if (el.nodeName.toLowerCase() === "a") {
            // detected click on a link
            link = el;
        } else {
            var focusedElement = document.activeElement;

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
                var targetUrl = link.href;
                var currentUrl = location.href;

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

    attachNonPreventedListener("submit", function (e) {
        var el = e.target;

        if (!el.target) {
            if (el.getAttribute("aria-disabled") === "true") {
                e.preventDefault();
            } else {
                var formEnctype = el.enctype;

                var url = el.action;

                if (formEnctype === "multipart/form-data") {
                    lastFormData = new FormData(el);
                } else {
                    var encode = formEnctype === "text/plain" ? identity : encodeURIComponent;
                    var qs = [];

                    for (var i = 0, field; field = el.elements[i]; ++i) {
                        if (field.name && !field.disabled) {
                            var fieldType = field.type;
                            var fieldName = encode(field.name);

                            if (fieldType === "select-multiple") {
                                for (var j = 0, option; option = field.options[j]; ++j) {
                                    if (option.selected) {
                                        qs.push(fieldName + "=" + encode(option.value));
                                    }
                                }
                            } else if (fieldType !== "checkbox" && fieldType !== "radio" || field.checked) {
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

    attachNonPreventedListener("ajaxify:fetch", function (e) {
        var el = e.target;
        var xhr = new XMLHttpRequest();
        var method = (el.method || "GET").toUpperCase();

        ["abort", "error", "load", "timeout"].forEach(function (type) {
            xhr["on" + type] = function () {
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

    attachNonPreventedListener("ajaxify:load", function (e) {
        var xhr = e.detail;
        var res = xhr.response;
        var resBody = res.body;

        var el = document.body;
        var content = resBody;
        var id = xhr.getResponseHeader(AJAXIFY_TARGET);

        if (!id) {
            var meta = res.querySelector("[http-equiv=" + AJAXIFY_TARGET + "]");

            id = meta ? meta.content : null;
        }

        if (id) {
            el = document.getElementById(id);
            content = el.cloneNode(false);
            // move all elements to replacement
            for (var node; node = resBody.firstChild;) {
                content.appendChild(node);
            }
        }

        var url = res.URL || xhr.responseURL;
        var title = res.title || document.title;

        updateCurrentState(el, title, content);

        lastState = {}; // create a new state object

        if (url !== location.href) {
            history.pushState(states.length, title, url);
        }
    });

    window.addEventListener("popstate", function (e) {
        // numeric value indicates better-ajaxify state
        if (!e.defaultPrevented && e.state >= 0) {
            var state = states[e.state];

            if (state) {
                var id = state.el.id;
                var el = id ? document.getElementById(id) : document.body;

                if (el) {
                    updateCurrentState(el, state.title, state.el);

                    lastState = state;
                }
            }
        }
    });

    // update initial state address url
    history.replaceState(0, document.title);
})(window.document, window.location, window.history, "X-Ajaxify-Target");
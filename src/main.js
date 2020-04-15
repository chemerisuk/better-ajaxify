(function(window) { /* jshint maxdepth:8, boss:true */
    // do not enable the plugin for old browsers
    if (!window.fetch || !window.Request || !window.Response) return;

    const document = window.document;
    const location = window.location;
    const history = window.history;

    const parser = new DOMParser();
    const identity = (s) => s;
    const domStates = []; // in-memory storage for states
    let lastDomState = {};

    function attachNonPreventedListener(target, eventType, callback) {
        target.addEventListener(eventType, (e) => {
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

    attachNonPreventedListener(document, "click", (e) => {
        const body = document.body;

        for (var el = e.target; el && el !== body; el = el.parentNode) {
            if (el.nodeName.toLowerCase() === "a") {
                if (!el.target) {
                    const targetUrl = el.href;

                    if (targetUrl && targetUrl.indexOf("http") === 0) {
                        const currentUrl = location.href;

                        if (targetUrl.split("#")[0] !== currentUrl.split("#")[0] ||
                            targetUrl === currentUrl && el.hash !== location.hash) {
                            dispatchAjaxifyEvent(el, "fetch", new Request(targetUrl));
                        } else {
                            location.hash = el.hash;
                        }
                        // always prevent default bahavior for anchors and links
                        e.preventDefault();
                    }
                }

                break;
            }
        }
    });

    attachNonPreventedListener(document, "submit", (e) => {
        const el = e.target;

        if (!el.target) {
            const formEnctype = el.getAttribute("enctype");

            let data;

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
                if (!(data instanceof FormData)) {
                    const encode = formEnctype === "text/plain" ? identity : encodeURIComponent;
                    const reSpace = encode === identity ? / /g : /%20/g;

                    data = Object.keys(data).map((key) => {
                        const name = encode(key);
                        let value = data[key];

                        if (Array.isArray(value)) {
                            value = value.map(encode).join("&" + name + "=");
                        }

                        return name + "=" + encode(value);
                    }).join("&").replace(reSpace, "+");
                }

                const options = {method: el.method.toUpperCase() || "GET"};
                let url = el.action;
                if (options.method === "GET") {
                    url += (~url.indexOf("?") ? "&" : "?") + data;
                } else {
                    options.body = data;
                }
                options.headers = {"Content-Type": formEnctype || el.enctype};

                dispatchAjaxifyEvent(el, "fetch", new Request(url, options));
                // always prevent default behavior for forms
                e.preventDefault();
            }
        }
    });

    attachNonPreventedListener(document, "ajaxify:fetch", (e) => {
        const domElement = e.target;
        const req = e.detail;

        fetch(req).then(res => {
            dispatchAjaxifyEvent(domElement, "load", res);
        }).catch(err => {
            if (dispatchAjaxifyEvent(domElement, "error", err)) {
                throw err;
            }
        });
    });

    attachNonPreventedListener(document, "ajaxify:load", (e) => {
        const domElement = e.target;
        const res = e.detail;

        res.text().then(html => {
            const doc = parser.parseFromString(html, "text/html");

            if (dispatchAjaxifyEvent(domElement, "navigate", doc)) {
                // Mobile Safari in full mode shows address bar
                // with navigation buttons after pushing a new state
                if (!window.navigator.standalone) {
                    if (res.url !== location.href.split("#")[0]) {
                        // update URL in address bar
                        history.pushState(domStates.length, doc.title, res.url);
                    } else {
                        history.replaceState(domStates.length - 1, doc.title, res.url);
                    }
                }
            }
        }).catch(err => {
            if (dispatchAjaxifyEvent(domElement, "error", err)) {
                throw err;
            }
        });
    });

    attachNonPreventedListener(document, "ajaxify:navigate", (e) => {
        const domElement = e.target;
        const currentDomState = e.detail;

        lastDomState.body = document.body;
        lastDomState.title = document.title;

        if (domStates.indexOf(lastDomState) >= 0) {
            lastDomState = currentDomState;
        } else {
            domStates.push(lastDomState);
            // make sure that next state will be a new object
            lastDomState = {};
        }
        // update HTML
        if (dispatchAjaxifyEvent(domElement, "render", currentDomState.body)) {
            // by default just swap elements
            document.documentElement.replaceChild(currentDomState.body, document.body);
        }
        // update page title
        document.title = currentDomState.title;
    });

    attachNonPreventedListener(window, "popstate", (e) => {
        const stateIndex = e.state;
        // numeric value indicates better-ajaxify state
        if (typeof stateIndex === "number") {
            const domState = domStates[stateIndex];
            if (domState) {
                dispatchAjaxifyEvent(document, "navigate", domState);
            } else {
                dispatchAjaxifyEvent(document, "fetch", new Request(location.href));
            }
        }

        // FIXME: trigger navigation request when /a -> /b#hash
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window));

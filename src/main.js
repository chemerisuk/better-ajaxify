(function(window) {
    const document = window.document;
    const location = window.location;
    const history = window.history;
    const fetch = window.fetch;
    const Request = window.Request;
    const URLSearchParams = window.URLSearchParams;
    // do not enable the plugin for old browsers
    if (!fetch || !Request || !URLSearchParams) return;

    const parser = new DOMParser();
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
                const targetUrl = el.href;

                if (!el.target && targetUrl && targetUrl.indexOf("http") === 0) {
                    const currentUrl = location.href;

                    if (targetUrl.split("#")[0] !== currentUrl.split("#")[0] ||
                        targetUrl === currentUrl && el.hash !== location.hash) {
                        dispatchAjaxifyEvent(el, "fetch", new Request(targetUrl));
                    } else {
                        location.hash = el.hash;
                    }
                    // always prevent default behavior for anchors and links
                    e.preventDefault();
                }

                break;
            }
        }
    });

    attachNonPreventedListener(document, "submit", (e) => {
        const el = e.target;
        let targetUrl = el.action;

        if (!el.target || !targetUrl || targetUrl.indexOf("http") === 0) {
            const formData = new FormData(el);

            if (dispatchAjaxifyEvent(el, "serialize", formData)) {
                const formMethod = el.method.toUpperCase() || "GET";
                const formEnctype = el.getAttribute("enctype") || el.enctype;
                const requestOptions = {method: formMethod, headers: {"Content-Type": formEnctype}};

                if (formEnctype === "multipart/form-data") {
                    requestOptions.body = formData;
                } else {
                    const searchParams = new URLSearchParams(formData);
                    if (requestOptions.method === "GET") {
                        targetUrl += (~targetUrl.indexOf("?") ? "&" : "?") + searchParams;
                    } else if (formEnctype !== "application/json") {
                        requestOptions.body = searchParams.toString();
                    } else {
                        const jsonData = {};
                        searchParams.forEach((value, key) => {
                            if (Array.isArray(jsonData[key])) {
                                jsonData[key].push(value);
                            } else if (key in jsonData) {
                                jsonData[key] = [jsonData[key], value];
                            } else {
                                jsonData[key] = value;
                            }
                        });
                        requestOptions.body = JSON.stringify(jsonData);
                    }
                }

                dispatchAjaxifyEvent(el, "fetch", new Request(targetUrl, requestOptions));
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

            if (dispatchAjaxifyEvent(domElement, "render", doc)) {
                if (res.url !== location.href.split("#")[0]) {
                    // update URL in address bar
                    history.pushState(domStates.length, doc.title, res.url);
                } else {
                    history.replaceState(domStates.length - 1, doc.title, res.url);
                }
            }
        }).catch(err => {
            if (dispatchAjaxifyEvent(domElement, "error", err)) {
                throw err;
            }
        });
    });

    attachNonPreventedListener(document, "ajaxify:render", (e) => {
        const newDomState = e.detail;

        lastDomState.body = document.body;
        lastDomState.title = document.title;

        if (domStates.indexOf(lastDomState) >= 0) {
            lastDomState = newDomState;
        } else {
            domStates.push(lastDomState);
            // make sure that next state will be a new object
            lastDomState = {};
        }
        // update HTML
        document.documentElement.replaceChild(newDomState.body, document.body);
        // update page title
        document.title = newDomState.title;
    });

    attachNonPreventedListener(window, "popstate", (e) => {
        const stateIndex = e.state;
        // numeric value indicates better-ajaxify state
        if (typeof stateIndex === "number") {
            const domState = domStates[stateIndex];
            if (domState) {
                dispatchAjaxifyEvent(document, "render", domState);
            } else {
                dispatchAjaxifyEvent(document, "fetch", new Request(location.href));
            }
        }

        // FIXME: trigger navigation request when /a -> /b#hash
    });

    // update initial state address url
    history.replaceState(0, document.title);

}(window));

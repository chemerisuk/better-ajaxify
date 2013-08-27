(function(DOM, location, history) {
    "use strict";

    var I18N_ERROR_TIMEOUT = "ajaxify-timeout",
        I18N_ERROR_UNKNOWN = "ajaxify-unknown",
        // internal data structures
        containers = DOM.findAll("[data-ajaxify=on]"),
        containersCache = {},
        // helpers
        switchContent = (function() {
            var currentLocation = location.href.split("#")[0];

            return function(url, title, data) {
                var cacheEntry = {};

                containers.each(function(el, index) {
                    var id = el.get("id"),
                        value = data[id];

                    if (typeof value === "string") {
                        value = el.clone().set(value);
                    }

                    cacheEntry[id] = el.replace(value);
                    // update value in the internal collection
                    containers[index] = value;
                });
                // update old containers to their latest state
                containersCache[currentLocation] = cacheEntry;
                // update current location variable
                currentLocation = url;
                // update page title
                DOM.setTitle(title);
            };
        }()),
        loadContent = (function() {
            // lock element to prevent double clicks
            var lockedEl, xhr, timerId;

            return function(sender, url, data) {
                if (lockedEl !== sender) {
                    lockedEl = sender;

                    if (xhr) {
                        xhr.abort(); // abort previous request if it's still in progress

                        clearTimeout(timerId);
                    }

                    xhr = new XMLHttpRequest();

                    timerId = setTimeout(function() {
                        xhr.abort();

                        sender.fire("ajaxify:error", I18N_ERROR_TIMEOUT);
                    }, 15000);

                    xhr.onerror = function() {
                        sender.fire("ajaxify:error", I18N_ERROR_UNKNOWN);
                    };

                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4) {
                            var status = xhr.status,
                                response = xhr.responseText;

                            sender.fire("ajaxify:loadend", xhr);

                            if (status > 0) {
                                // try to parse response
                                try {
                                    response = JSON.parse(response);
                                    response.url = response.url || url;
                                } catch(err) {
                                    // response is a text content
                                }
                            }

                            if (status >= 200 && status < 300 || status === 304) {
                                sender.fire("ajaxify:success", response);
                            } else {
                                sender.fire("ajaxify:error", response);
                            }

                            clearTimeout(timerId);

                            xhr = null; // memory cleanup
                        }
                    };

                    xhr.open(data ? "POST" : "GET", data ? url : (url + (~url.indexOf("?") ? "&" : "?") + new Date().getTime()), true);
                    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");

                    if (data) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

                    sender.fire("ajaxify:loadstart", xhr);

                    xhr.send(data);
                }
            };
        }()),
        makePair = function(name, value) {
            return encodeURIComponent(name) + "=" + encodeURIComponent(value);
        };

    if (containers.some(function(el) { return !el.get("id"); })) {
        throw "Each [data-ajaxify=on] element must have unique id attribute";
    }

    // use mousedown/touchstart for faster ajax request
    DOM.on((DOM.supports("onmousedown") ? "mousedown" : "touchstart") + " a", ["target", "defaultPrevented"], function(link, defaultPrevented) {
        if (!defaultPrevented && !link.get("target") && link.get("host") === location.host) {
            var url = link.get("href").split("#")[0];

            if (url !== location.href.split("#")[0]) {
                loadContent(link, url);
            }
        }
    });

    DOM.on("click a", ["target", "defaultPrevented"], function(link, defaultPrevented) {
        if (!defaultPrevented && !link.get("target") && link.get("host") === location.host) {
            // prevent default behavior for links
            if (!location.hash) return false;
        }
    });

    DOM.on("submit", ["target", "defaultPrevented"], function(form, defaultPrevented) {
        if (!defaultPrevented && !form.get("target")) {
            var url = form.get("action"),
                queryString = form.toQueryString();

            if (form.get("method") === "get") {
                url += (~url.indexOf("?") ? "&" : "?") + queryString;
                queryString = null;
            }

            loadContent(form, url, queryString);

            return false;
        }
    });

    DOM.on("ajaxify:success", ["detail"], function(response) {
        if (typeof response === "object") {
            switchContent(response.url, response.title, response.html);
            // update browser url
            if (response.url !== location.pathname) {
                history.pushState({title: DOM.getTitle()}, DOM.getTitle(), response.url);
            } else if (history.replaceState) {
                history.replaceState({title: DOM.getTitle()}, DOM.getTitle());
            }
        }
    });

    if (history.pushState) {
        window.addEventListener("popstate", function(e) {
            var url = location.href.split("#")[0],
                state = e.state;

            if (!state) return;

            if (url in containersCache) {
                switchContent(url, state.title, containersCache[url]);
            } else {
                // TODO: need to trigger partial reload?
                location.reload();
            }
        }, false);
        // update initial state
        history.replaceState({title: DOM.getTitle()}, DOM.getTitle());
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", ["target", "defaultPrevented"], function(sender, defaultPrevented) {
            if (!defaultPrevented && sender.get("method") !== "post") {
                // load a new page in legacy browsers
                if (sender.matches("form")) {
                    sender.fire("submit");
                } else {
                    location.href = sender.get("href");
                }
            }
        });
    }

    DOM.extend("input,select,textarea", {
        toQueryString: function() {
            var name = this.get("name"),
                result = [];

            if (name) { // don't include form fields without names
                switch(this.get("type")) {
                case "select-one":
                case "select-multiple":
                    this.get("options").each(function(option) {
                        if (option.get("selected")) {
                            result.push(makePair(name, option.get()));
                        }
                    });
                    break;

                case "file": // file input
                case "submit": // submit button
                case "reset": // reset button
                case "button": // custom button
                    break;

                case "radio": // radio button
                case "checkbox": // checkbox
                    if (!this.get("checked")) break;
                    /* falls through */
                default:
                    result.push(makePair(name, this.get()));
                }
            }

            return result.join("&").replace(/%20/g, "+");
        }
    });

    DOM.extend("form,fieldset", {
        toQueryString: function() {
            return this.get("elements").reduce(function(memo, el) {
                if (el.toQueryString && !el.matches("fieldset")) {
                    var str = el.toQueryString();

                    if (str) memo += (memo ? "&" : "") + str;
                }

                return memo;
            }, "");
        }
    });

}(window.DOM, location, history));

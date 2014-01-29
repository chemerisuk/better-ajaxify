/**
 * @file src/better-ajaxify-pushstate.js
 * @version 1.6.0-rc.1 2014-01-29T22:56:52
 * @overview Ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2014
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location, history) {
    "use strict";

    DOM.on("ajaxify:load", function(response, target, currentTarget, cancel) {
        if (!cancel && typeof response === "object") {
            // update browser url
            if (response.url !== location.pathname + location.search) {
                history.pushState(true, response.title, response.url);
            }
        }
    });

    if (history.pushState) {
        window.addEventListener("popstate", function(e) {
            if (e.state) {
                DOM.fire("ajaxify:history", location.pathname + location.search);
            }
        });
        // update initial state
        history.replaceState(true, DOM.get("title"));
        // fix bug with external pages
        window.addEventListener("beforeunload", function() {
            history.replaceState(null, DOM.get("title"));
        });
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", function(xhr, sender, currentTarget, defaultPrevented) {
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
}(window.DOM, location, history));

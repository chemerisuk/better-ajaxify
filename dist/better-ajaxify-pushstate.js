/**
 * @file src/better-ajaxify-pushstate.js
 * @version 1.5.2 2013-12-25T18:59:45
 * @overview Ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2013
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location, history) {
    "use strict";

    DOM.on("ajaxify:load", function(response, target, cancel) {
        if (!cancel && typeof response === "object") {
            // update browser url
            if (response.url !== location.pathname) {
                history.pushState(true, response.title, response.url);
            } else if (history.replaceState) {
                history.replaceState(true, response.title);
            }
        }
    });

    if (history.pushState) {
        window.onpopstate = function(e) {
            var url = location.href.split("#")[0];

            // skip initial popstate
            if (!e.state) return;

            DOM.fire("ajaxify:history", url);
        };
        // update initial state
        history.replaceState(true, DOM.get("title"));
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", function(xhr, sender, defaultPrevented) {
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

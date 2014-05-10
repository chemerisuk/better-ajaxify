/**
 * @file src/better-ajaxify-pushstate.js
 * @version 1.6.0-rc.4 2014-05-10T15:50:10
 * @overview Pjax website engine for better-dom
 * @copyright Maksim Chemerisuk 2014
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location, history) {
    "use strict";

    DOM.on("ajaxify:loadend", function(response, xhr, target, _, canceled) {
        if (!canceled && typeof response === "object") {
            // update url in address bar
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
        DOM.on("ajaxify:loadstart", function(xhr, sender, _, canceled) {
            if (!canceled && sender.get("method") !== "post") {
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

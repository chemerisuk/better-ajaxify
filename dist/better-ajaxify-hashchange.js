/**
 * @file src/better-ajaxify-hashchange.js
 * @version 1.6.0-rc.2 2014-02-27T00:31:24
 * @overview Ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2014
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location) {
    "use strict";

    var baseUrl = location.pathname,
        skipHashchange = false;

    DOM.on("ajaxify:load", function(response, xhr, target, _, canceled) {
        if (!canceled && typeof response === "object") {
            // update browser url
            if (response.url !== location.hash.replace("#/", "")) {
                skipHashchange = true;

                location.hash = response.url.replace(baseUrl, "/");
            }
        }
    });

    window.onhashchange = function() {
        if (skipHashchange) {
            skipHashchange = false;
        } else {
            DOM.fire("ajaxify:history", baseUrl + location.hash.replace("#/", ""));
        }
    };

    if (~location.hash.indexOf("#/")) {
        DOM.ready(function() {
            DOM.fire("ajaxify:fetch", location.href.replace("#/", ""));
        });
    }
}(window.DOM, location));

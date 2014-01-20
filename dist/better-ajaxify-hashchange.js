/**
 * @file src/better-ajaxify-hashchange.js
 * @version 1.6.0-beta.1 2014-01-21T01:19:32
 * @overview Ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2014
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location) {
    "use strict";

    var baseUrl = location.href.split(/[\?#]/)[0],
        skipHashchange = false;

    DOM.on("ajaxify:load", function(response, target, currentTarget, cancel) {
        if (!cancel && typeof response === "object") {
            // update browser url
            if (response.url !== location.hash.replace("#/", "")) {
                skipHashchange = true;

                location.hash = response.url;
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

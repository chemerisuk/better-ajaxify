/**
 * @file src/better-ajaxify-hashchange.js
 * @version 1.7.0-beta.1 2014-09-17T21:32:06
 * @overview Ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2014
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location) {
    "use strict";

    var baseUrl = location.href.split(/[\?#]/)[0],
        skipHashchange = false;

    DOM.on("ajaxify:loadend", [1, "defaultPrevented"], function(response, canceled) {
        if (!canceled && typeof response === "object") {
            // update browser url
            if (response.url !== location.href.replace("#/", "")) {
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
        DOM.fire("ajaxify:get", baseUrl + location.hash.replace("#/", ""));
    }
}(window.DOM, location));

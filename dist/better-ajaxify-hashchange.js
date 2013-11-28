/**
 * @file src/better-ajaxify-hashchange.js
 * @version 1.5.0-rc.2 2013-11-28T20:05:04
 * @overview Ajax website engine for better-dom
 * @copyright Maksim Chemerisuk 2013
 * @license MIT
 * @see https://github.com/chemerisuk/better-ajaxify
 */
(function(DOM, location) {
    "use strict";

    var baseUrl = location.href.split(/[\?#]/)[0],
        skipHashchange = false;

    DOM.on("ajaxify:load", function(response, target, cancel) {
        if (!cancel && typeof response === "object") {
            // update browser url
            if (response.url !== location.pathname) {
                var hash = response.url;

                if (!hash.indexOf(baseUrl)) {
                    hash = hash.substr(baseUrl.length - 1);
                } else if (hash[0] !== "/" && hash[0] !== "#") {
                    // fix relative urls
                    hash = "/" + hash;
                }

                skipHashchange = true;

                location.hash = hash;
            }
        }
    });

    window.onhashchange = function() {
        if (skipHashchange) {
            skipHashchange = false;
        } else {
            DOM.fire("ajaxify:history", baseUrl + location.hash.substr(2));
        }
    };

    if (~location.hash.indexOf("#/")) {
        DOM.ready(function() {
            DOM.fire("ajaxify:fetch", location.href.replace("#/", ""));
        });
    }
}(window.DOM, location));

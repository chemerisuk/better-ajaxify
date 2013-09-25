(function(DOM, location) {
    "use strict";

    var baseUrl = location.href.split(/[\?#]/)[0],
        skipHashchange = false;

    DOM.on("ajaxify:load", ["detail"], function(response) {
        if (typeof response === "object") {
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

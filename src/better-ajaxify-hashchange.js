(function(DOM, location) {
    "use strict";

    var skipHashchange = false;

    DOM.on("ajaxify:load", function(response, target, currentTarget, cancel) {
        if (!cancel && typeof response === "object") {
            // update browser url
            if (response.url !== location.pathname + location.search) {
                var hash = response.url;

                if (hash[0] !== "/" && hash[0] !== "#") {
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

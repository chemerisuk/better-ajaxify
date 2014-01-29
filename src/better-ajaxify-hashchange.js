(function(DOM, location) {
    "use strict";

    var baseUrl = location.pathname,
        skipHashchange = false;

    DOM.on("ajaxify:load", function(response, target, currentTarget, cancel) {
        if (!cancel && typeof response === "object") {
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

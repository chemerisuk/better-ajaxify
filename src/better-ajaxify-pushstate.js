(function(DOM, location, history) {
    "use strict";

    DOM.on("ajaxify:load", function(response, target, currentTarget, cancel) {
        if (!cancel && typeof response === "object") {
            // update browser url
            if (response.url !== location.pathname + location.search) {
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

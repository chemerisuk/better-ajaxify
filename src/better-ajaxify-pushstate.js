(function(DOM, location, history) {
    "use strict";

    DOM.on("ajaxify:loadend", [1, "defaultPrevented"], function(response, canceled) {
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
                DOM.fire("ajaxify:history", location.href);
            }
        });
        // update initial state address url
        history.replaceState(true, DOM.get("title"));
        // fix bug with external pages
        window.addEventListener("beforeunload", function() {
            history.replaceState(null, DOM.get("title"));
        });
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", ["target", "defaultPrevented"], function(sender, canceled) {
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

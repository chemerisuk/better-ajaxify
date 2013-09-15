(function(DOM, location, history) {
    "use strict";

    DOM.on("ajaxify:success", ["detail"], function(response) {
        if (typeof response === "object") {
            // update browser url
            if (response.url !== location.pathname) {
                history.pushState({title: DOM.getTitle()}, DOM.getTitle(), response.url);
            } else if (history.replaceState) {
                history.replaceState({title: DOM.getTitle()}, DOM.getTitle());
            }
        }
    });

    if (history.pushState) {
        window.addEventListener("popstate", function(e) {
            var url = location.href.split("#")[0],
                state = e.state;

            if (!state) return;

            DOM.fire("ajaxify:history", url);
        }, false);
        // update initial state
        history.replaceState({title: DOM.getTitle()}, DOM.getTitle());
    } else {
        // when url should be changed don't start request in old browsers
        DOM.on("ajaxify:loadstart", function(sender, defaultPrevented) {
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

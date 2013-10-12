document.write("<div data-ajaxify='test'>55555</div>");

describe("switch content", function() {
    "use strict";

    it("should change content of appropriate element", function() {
        runs(function() {
            DOM.ready(function() {
                DOM.fire("ajaxify:load", {
                    title: "switch",
                    url: location.pathname,
                    html: {
                        test: "test updated",
                        other: "other updated"
                    }
                });
            });
        });

        waitsFor(function() {
            var el = DOM.find("[data-ajaxify=test]");

            return DOM.getTitle() === "switch" && el.get() === "test updated";
        });
    });

});
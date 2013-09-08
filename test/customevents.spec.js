describe("Custom events", function() {
    "use strict";

    if (!history.pushState) return;

    describe("ajaxify:success", function() {
        it("should update url and containers", function() {
            var spy = spyOn(history, "pushState");

            DOM.fire("ajaxify:success", {url: "a", title: "b"});
            expect(spy).toHaveBeenCalledWith({title: "b"}, "b", "a");
        });

        it("should replace state if url is the same", function() {
            var spy = spyOn(history, "replaceState");

            DOM.fire("ajaxify:success", {url: location.pathname, title: "d"});
            expect(spy).toHaveBeenCalledWith({title: "d"}, "d");
        });

        it("should do nothing if response is not an object", function() {
            var spy = spyOn(history, "pushState");

            DOM.fire("ajaxify:success", "343");
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe("ajaxify:fetch", function() {
        var spy;

        beforeEach(function() {
            spy = spyOn(XMLHttpRequest.prototype, "send");
        });

        it("should trigger ajax request", function() {
            DOM.fire("ajaxify:fetch", "test");
            expect(spy).toHaveBeenCalled();
        });

        it("should respect defaultPrevented", function() {
            var cancelSpy = jasmine.createSpy("cancel").andReturn(false);

            DOM.once("ajaxify:fetch", cancelSpy);
            DOM.fire("ajaxify:fetch", "test");

            expect(cancelSpy).toHaveBeenCalled();
            expect(spy).not.toHaveBeenCalled();
        });
    });
});

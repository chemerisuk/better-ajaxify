describe("Custom events", function() {
    "use strict";

    if (!history.pushState) return;

    describe("ajaxify:load", function() {
        it("should update url and containers", function() {
            var spy = spyOn(history, "pushState");

            DOM.fire("ajaxify:load", {url: "a", title: "b"});
            expect(spy).toHaveBeenCalledWith(true, "b", "a");
        });

        it("should replace state if url is the same", function() {
            var spy = spyOn(history, "replaceState");

            DOM.fire("ajaxify:load", {url: location.pathname, title: "d"});
            expect(spy).toHaveBeenCalledWith(true, "d");
        });

        it("should do nothing if response is not an object", function() {
            var spy = spyOn(history, "pushState");

            DOM.fire("ajaxify:load", "343");
            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe("ajaxify:fetch", function() {
        var spy;

        beforeEach(function() {
            spy = spyOn(XMLHttpRequest.prototype, "send");
        });

        it("should trigger ajax request", function() {
            runs(function() {
                DOM.ready(function() {
                    DOM.fire("ajaxify:fetch", "test");
                });
            });

            waitsFor(function() {
                return spy.callCount === 1;
            });
        });

        it("should respect defaultPrevented", function() {
            var cancelSpy = jasmine.createSpy("cancel").andReturn(false),
                body = DOM.find("body");

            body.once("ajaxify:fetch", cancelSpy);
            body.fire("ajaxify:fetch", "test");

            expect(cancelSpy).toHaveBeenCalled();
            expect(spy).not.toHaveBeenCalled();
        });

        it("should throw error if argument is invalid", function() {
            var spy = jasmine.createSpy("error").andReturn(true);

            window.onerror = spy;

            runs(function() {
                DOM.ready(function() {
                    DOM.fire("ajaxify:fetch");
                    DOM.fire("ajaxify:fetch", null);
                });
            });

            waitsFor(function() {
                if (spy.callCount === 2) {
                    window.onerror = undefined;

                    return true;
                };
            });
        });
    });

    describe("ajaxify:history", function() {
        it("should trigger page reload if url is not in history cache", function() {
            var locationSpy = spyOn(location, "reload");

            runs(function() {
                DOM.ready(function() {
                    DOM.fire("ajaxify:history", "???");
                });
            });

            waitsFor(function() {
                return locationSpy.callCount === 1;
            });
        });
    });
});

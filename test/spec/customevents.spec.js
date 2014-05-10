describe("Custom events", function() {
    "use strict";

    if (!history.pushState) return;

    describe("ajaxify:load", function() {
        it("should update url and containers", function() {
            var spy = spyOn(history, "pushState");

            DOM.fire("ajaxify:loadend", {url: "a", title: "b"});
            expect(spy).toHaveBeenCalledWith(true, "b", "a");
        });

        // it("should replace state if url is the same", function() {
        //     var spy = spyOn(history, "replaceState");

        //     DOM.fire("ajaxify:load", {url: location.pathname, title: "d"});
        //     expect(spy).toHaveBeenCalledWith(true, "d");
        // });

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

        it("should trigger ajax request", function(done) {
            DOM.ready(function() {
                DOM.fire("ajaxify:fetch", "test");
            });

            setTimeout(function() {
                expect(spy).toHaveBeenCalled();

                done();
            }, 100);
        });

        it("should respect defaultPrevented", function() {
            var cancelSpy = jasmine.createSpy("cancel").and.returnValue(false),
                body = DOM.find("body");

            body.once("ajaxify:fetch", cancelSpy);
            body.fire("ajaxify:fetch", "test");

            expect(cancelSpy).toHaveBeenCalled();
            expect(spy).not.toHaveBeenCalled();
        });

        it("should throw error if argument is invalid", function(done) {
            var spy = jasmine.createSpy("error").and.returnValue(true);

            window.onerror = spy;

            DOM.ready(function() {
                DOM.fire("ajaxify:fetch");
                DOM.fire("ajaxify:fetch", null);
            });

            setTimeout(function() {
                expect(spy.calls.count()).toBe(2);

                window.onerror = undefined;

                done();
            }, 100);
        });

        it("should support optional callback argument", function(done) {
            DOM.ready(function() {
                DOM.fire("ajaxify:fetch", "test", function() {});
            });

            setTimeout(function() {
                expect(spy.calls.count()).toBe(1);

                done();
            }, 100);
        });

        it("should respect defaultPrevented of ajaxify:loadstart", function(done) {
            DOM.ready(function() {
                var loadstartSpy = jasmine.createSpy("loadstart").and.returnValue(false);

                DOM.once("ajaxify:loadstart", loadstartSpy);
                DOM.fire("ajaxify:fetch", "test");
                expect(loadstartSpy).toHaveBeenCalled();
            });

            setTimeout(function() {
                expect(spy.calls.count()).toBe(0);

                done();
            }, 100);
        });
    });

    describe("ajaxify:history", function() {
        it("should trigger page reload if url is not in history cache", function(done) {
            var fetchSpy = jasmine.createSpy("fetch");

            DOM.once("ajaxify:fetch", fetchSpy);

            DOM.ready(function() {
                DOM.fire("ajaxify:history", "???");
            });

            setTimeout(function() {
                expect(fetchSpy.calls.count()).toBe(1);

                done();
            }, 100);
        });
    });
});

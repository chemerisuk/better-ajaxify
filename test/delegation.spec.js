describe("delegation", function() {
    "use strict";

    var spy, sandbox,
        WAIT_FOR_WATCH_TIME = 50;

    beforeEach(function() {
        spy = spyOn(XMLHttpRequest.prototype, "send");
        sandbox = DOM.create("div");
        DOM.find("body").append(sandbox);
    });

    afterEach(function() {
        sandbox.remove();
    });

    describe("links", function() {
        it("should skip clicks in some cases", function() {
            var spy2 = jasmine.createSpy("click").andReturn(false);

            DOM.on("click", spy2);

            sandbox.set("<a target=_blank>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();

            sandbox.set("<a href='http://google.com'>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();

            sandbox.set("<a href='test' onclick='return false'>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();

            sandbox.set("<a href='#test'>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should prevent default clicks and send ajax-request instead", function() {
            var spy2 = jasmine.createSpy("click").andCallFake(function(defaultPrevented) {
                expect(defaultPrevented).toBe(true);
                // cancel click anyway
                return false;
            });

            DOM.on("click", ["defaultPrevented"], spy2);

            sandbox.set("<a href='test'>123</a>");
            sandbox.find("a").fire("mousedown").fire("click");
            expect(spy).toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });
    });

    describe("forms", function() {
        it("should skip submits in some cases", function() {
            var spy2 = jasmine.createSpy("submit").andReturn(false);

            DOM.on("submit", spy2);

            sandbox.set("<form target=_blank method='post'></form>");
            waits(WAIT_FOR_WATCH_TIME);

            runs(function() {
                sandbox.find("form").fire("submit");
                expect(spy).not.toHaveBeenCalled();
                expect(spy2).toHaveBeenCalled();
            });

            sandbox.set("<form onsubmit='return false'></form>");
            waits(WAIT_FOR_WATCH_TIME);

            runs(function() {
                sandbox.find("form").fire("submit");
                expect(spy).not.toHaveBeenCalled();
                expect(spy2).toHaveBeenCalled();
            });
        });

        it("should prevent default submits and send ajax-request instead", function() {
            var spy2 = jasmine.createSpy("submit").andCallFake(function(defaultPrevented) {
                expect(defaultPrevented).toBe(true);
                // cancel submit anyway
                return false;
            });

            DOM.on("submit", ["defaultPrevented"], spy2);

            sandbox.set("<form action='test' method='post'><input name='1' value='2'></form>");
            waits(WAIT_FOR_WATCH_TIME);

            runs(function() {
                sandbox.find("form").fire("submit");
                expect(spy).toHaveBeenCalled();
                expect(spy2).toHaveBeenCalled();
            });
        });

        it("should handle post forms too", function() {
            var spy2 = jasmine.createSpy("submit").andCallFake(function(defaultPrevented) {
                expect(defaultPrevented).toBe(true);
                // cancel submit anyway
                return false;
            });

            DOM.on("submit", ["defaultPrevented"], spy2);

            sandbox.set("<form method='get' action='test?a=b'></form>");
            waits(WAIT_FOR_WATCH_TIME);

            runs(function() {
                sandbox.find("form").fire("submit");
                expect(spy).toHaveBeenCalled();
                expect(spy2).toHaveBeenCalled();
            });
        });
    });
});

describe("delegation", function() {
    "use strict";

    var spy, sandbox;

    beforeEach(function() {
        spy = spyOn(XMLHttpRequest.prototype, "send");
        sandbox = DOM.create("div");
        DOM.find("body").append(sandbox);
    });

    afterEach(function() {
        sandbox.remove();
    });

    describe("links", function() {
        it("should skip clicks on a element with target attribute", function() {
            var spy2 = jasmine.createSpy("click").andReturn(false);

            DOM.on("click", spy2);

            sandbox.set("<a target=_blank>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should skip links if default action was prevented", function() {
            var spy2 = jasmine.createSpy("click").andReturn(false);

            DOM.on("click", spy2);

            sandbox.set("<a href='test' onclick='return false'>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should allow links from a different domain", function() {
            var spy2 = jasmine.createSpy("click").andReturn(false);

            DOM.on("click", spy2);

            sandbox.set("<a href='http://google.com'>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should skip links without href", function() {
            var spy2 = jasmine.createSpy("click").andReturn(false);

            DOM.on("click", spy2);

            // sandbox.set("<a href='#test'>123</a>");
            // sandbox.find("a").fire("click");
            // expect(spy).not.toHaveBeenCalled();
            // expect(spy2).toHaveBeenCalled();

            sandbox.set("<a>123</a>");
            sandbox.find("a").fire("click");
            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should handle click on elements with internal tree", function() {
            var spy2 = jasmine.createSpy("click").andReturn(false);

            DOM.on("click", spy2);

            sandbox.set("<a href='test'><i>icon</i>123</a>");
            sandbox.find("i").fire("click");
            expect(spy).toHaveBeenCalled();
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
            sandbox.find("a").fire("click");
            expect(spy).toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });
    });

    describe("forms", function() {
        it("should skip submits in some cases", function() {
            var form = DOM.mock("<form target=_blank method='post'></form>"),
                spy2 = jasmine.createSpy("submit").andReturn(false);

            sandbox.append(form);

            DOM.on("submit", spy2);
            form.fire("submit");

            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();

            form = DOM.mock("<form onsubmit='return false'></form>");
            sandbox.append(form);

            DOM.on("submit", spy2);
            form.fire("submit");

            expect(spy).not.toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should prevent default submits and send ajax-request instead", function() {
            var form = DOM.mock("<form action='test' method='post'><input name='1' value='2'></form>"),
                spy2 = jasmine.createSpy("submit").andCallFake(function(defaultPrevented) {
                expect(defaultPrevented).toBe(true);
                // cancel submit anyway
                return false;
            });

            sandbox.append(form);

            DOM.on("submit", ["defaultPrevented"], spy2);
            form.fire("submit");

            expect(spy).toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should handle post forms too", function() {
            var form = DOM.mock("<form method='get' action='test?a=b'></form>"),
                spy2 = jasmine.createSpy("submit").andCallFake(function(defaultPrevented) {
                expect(defaultPrevented).toBe(true);
                // cancel submit anyway
                return false;
            });

            sandbox.append(form);

            DOM.on("submit", ["defaultPrevented"], spy2);
            form.fire("submit");

            expect(spy).toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });
    });
});

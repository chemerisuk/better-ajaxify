describe("links", function() {
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

    it("should skip clicks on a element with target attribute", function() {
        var spy2 = jasmine.createSpy("click").and.returnValue(false);

        DOM.on("click", spy2);

        sandbox.set("<a target=_blank>123</a>");
        sandbox.find("a").fire("click");
        expect(spy).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });

    it("should skip links if default action was prevented", function() {
        var spy2 = jasmine.createSpy("click").and.returnValue(false);

        DOM.on("click", spy2);

        sandbox.set("<a href='test' onclick='return false'>123</a>");
        sandbox.find("a").fire("click");
        expect(spy).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });

    it("should allow links from a different domain", function() {
        var spy2 = jasmine.createSpy("click").and.returnValue(false);

        DOM.on("click", spy2);

        sandbox.set("<a href='http://google.com'>123</a>");
        sandbox.find("a").fire("click");
        expect(spy).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });

    it("should skip links without href", function() {
        var spy2 = jasmine.createSpy("click").and.returnValue(false);

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

    it("should skip non-http(s) links", function() {
        sandbox.set("<a href='mailto:support@google.com'>123</a>");
        sandbox.find("a").fire("click");
        expect(spy).not.toHaveBeenCalled();
    });

    it("should handle click on elements with internal tree", function() {
        var spy2 = jasmine.createSpy("click").and.returnValue(false);

        DOM.on("click", spy2);

        sandbox.set("<a href='test'><i>icon</i>123</a>");
        sandbox.find("i").fire("click");
        expect(spy).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });

    it("should prevent default clicks and send ajax-request instead", function() {
        var spy2 = jasmine.createSpy("click").and.callFake(function(defaultPrevented) {
            expect(defaultPrevented).toBe(true);
            // cancel click anyway
            return false;
        });

        DOM.on("click", spy2, ["defaultPrevented"]);

        sandbox.set("<a href='test'>123</a>");
        sandbox.find("a").fire("click");
        expect(spy).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });

    it("should not allow to send the same request twice except it's DOM", function() {
        sandbox.set("<a href='abc'>123</a>");

        var link = sandbox.find("a"),
            spy2 = jasmine.createSpy("click").and.returnValue(false);

        DOM.on("click", spy2);

        link.fire("click");
        link.fire("click");
        expect(spy.calls.count()).toBe(1);

        spy.calls.reset();

        DOM.fire("ajaxify:get", "abc");
        DOM.fire("ajaxify:get", "abc");
        expect(spy.calls.count()).toBe(2);
    });

    // it("should have fastclick support", function() {
    //     sandbox.set("<a href='http://google.com'>123</a>");

    //     var spy2 = jasmine.createSpy("click").and.returnValue(false),
    //         link = sandbox.find("a");

    //     DOM.on("click", spy2);


    //     link.fire("touchstart");
    //     expect(spy).not.toHaveBeenCalled();

    //     link.style("touch-action", "none");

    //     link.fire("touchstart");
    //     expect(spy).toHaveBeenCalled();
    // });
});
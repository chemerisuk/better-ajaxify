describe("links", function() {
    "use strict";

    beforeEach(function() {
        jasmine.Ajax.install();

        this.sandbox = DOM.create("div");

        DOM.find("body").append(this.sandbox);
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();

        this.sandbox.remove();

        this.xhr = null;
    });

    it("should send AJAX request for links", function() {
        var link = DOM.create("a[href=test]");

        this.sandbox.append(link);

        link.fire("click");

        this.xhr = jasmine.Ajax.requests.mostRecent();

        expect(this.xhr).toBeDefined();
        expect(this.xhr.readyState).toBe(2);
        expect(this.xhr.method).toBe("GET");
        expect(this.xhr.url.indexOf(link.get("href"))).toBe(0);
    });

    it("should skip canceled events", function() {
        var link = DOM.create("a[href=test]"),
            spy = jasmine.createSpy("click");

        this.sandbox.append(link);

        link.on("click", spy.and.returnValue(false));
        link.fire("click");

        expect(spy).toHaveBeenCalled();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip elements with target", function() {
        var link = DOM.create("a[href=test target=_blank]");

        this.sandbox.append(link);

        link.fire("click");

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip non-http", function() {
        var link = DOM.create("a[href=`mailto:support@google.com`]"),
            spy = jasmine.createSpy("unload"),
            onunload = window.onbeforeunload;

        this.sandbox.append(link);

        window.onbeforeunload = spy;
        link.fire("click");
        window.onbeforeunload = onunload;

        expect(spy).toHaveBeenCalled();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip absent href", function() {
        var link = DOM.create("a");

        this.sandbox.append(link);

        link.fire("click");

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should handle click on elements with internal tree", function() {
        var link = DOM.create("a[href=test]>i>`icon`");

        this.sandbox.append(link);

        link.child(0).fire("click");

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).toBeDefined();
        expect(this.xhr.readyState).toBe(2);
        expect(this.xhr.method).toBe("GET");
        expect(this.xhr.url.indexOf(link.get("href"))).toBe(0);
    });

    // var spy, sandbox;

    // beforeEach(function() {
    //     spy = spyOn(XMLHttpRequest.prototype, "send");
    //     sandbox = DOM.create("div");
    //     DOM.find("body").append(sandbox);
    // });

    // afterEach(function() {
    //     sandbox.remove();
    // });

    // it("should allow links from a different domain", function() {
    //     var spy2 = jasmine.createSpy("click").and.returnValue(false);

    //     DOM.on("click", spy2);

    //     sandbox.set("<a href='http://google.com'>123</a>");
    //     sandbox.find("a").fire("click");
    //     expect(spy).toHaveBeenCalled();
    //     expect(spy2).toHaveBeenCalled();
    // });

    // it("should not allow to send the same request twice except it's DOM", function() {
    //     sandbox.set("<a href='abc'>123</a>");

    //     var link = sandbox.find("a"),
    //         spy2 = jasmine.createSpy("click").and.returnValue(false);

    //     DOM.on("click", spy2);

    //     link.fire("click");
    //     link.fire("click");
    //     expect(spy.calls.count()).toBe(1);

    //     spy.calls.reset();

    //     DOM.fire("ajaxify:get", "abc");
    //     DOM.fire("ajaxify:get", "abc");
    //     expect(spy.calls.count()).toBe(2);
    // });

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
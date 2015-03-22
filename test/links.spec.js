describe("links", function() {
    "use strict";

    beforeEach(function() {
        jasmine.Ajax.install();

        this.sandbox = DOM.create("div");
        this.randomUrl = String(Date.now());

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

    it("should skip elements with target", function(done) {
        var link = DOM.create("a[href=test target=_blank]");

        document.onclick = function(e) {
            expect(e.defaultPrevented).toBe(false);
            e.preventDefault();
            // cleanup
            document.onclick = null;

            done();
        };

        this.sandbox.append(link);
        link.fire("click");

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip non-http", function(done) {
        var link = DOM.create("a[href=`mailto:support@google.com`]");

        document.onclick = function(e) {
            expect(e.defaultPrevented).toBe(false);
            e.preventDefault();
            // cleanup
            document.onclick = null;

            done();
        };

        this.sandbox.append(link);
        link.fire("click");

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

    it("skips anchors", function() {
        var link = DOM.create("a[href=#foo]");

        this.sandbox.append(link);

        expect(link.fire("click")).toBe(true);

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

    it("should not allow to send the same request twice", function() {
        var link = DOM.create("a[href=test]");

        this.sandbox.append(link);

        link.fire("click");
        link.fire("click");

        expect(jasmine.Ajax.requests.count()).toBe(1);
    });

    it("skips links with the current url", function(done) {
        var link = DOM.create("a");

        link.set("href", location.href.split("#")[0]);

        this.sandbox.append(link);

        expect(link.fire("click")).toBe(false);
        link.on("ajaxify:change", done);
    });
});
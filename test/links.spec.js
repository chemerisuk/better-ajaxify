describe("links", function() {
    "use strict";

    function createLink(url) {
        const link = document.createElement("a");

        if (url !== null) {
            link.setAttribute("href", url);
        }

        return link;
    }

    beforeEach(function() {
        jasmine.Ajax.install();

        this.sandbox = document.createElement("div");
        this.randomUrl = Math.random().toString(32).slice(2);

        document.body.appendChild(this.sandbox);
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();

        document.body.removeChild(this.sandbox);

        this.xhr = null;
    });

    it("should send AJAX request for links", function() {
        const link = createLink("test" + Date.now());

        this.sandbox.appendChild(link);
        link.click();

        this.xhr = jasmine.Ajax.requests.mostRecent();

        expect(this.xhr).toBeDefined();
        expect(this.xhr.method).toBe("GET");
        expect(this.xhr.url).toBe(link.href);
    });

    it("should skip canceled events", function() {
        const link = createLink("test" + Date.now());
        const spy = jasmine.createSpy("click");

        this.sandbox.appendChild(link);

        link.onclick = spy.and.returnValue(false);
        link.click();

        expect(spy).toHaveBeenCalled();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip elements with target", function(done) {
        const link = createLink("test" + Date.now());

        link.target = "_blank";

        document.onclick = function(e) {
            expect(e.defaultPrevented).toBe(false);
            e.preventDefault();
            // cleanup
            document.onclick = null;

            done();
        };

        this.sandbox.appendChild(link);
        link.click();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip non-http", function(done) {
        const link = createLink("mailto:support@google.com");

        document.onclick = function(e) {
            expect(e.defaultPrevented).toBe(false);
            e.preventDefault();
            // cleanup
            document.onclick = null;

            done();
        };

        this.sandbox.appendChild(link);
        link.click();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip absent href", function() {
        var link = createLink(null);

        this.sandbox.appendChild(link);
        link.click();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("overrides default behavior for anchors", function() {
        var link = createLink("#foo");

        this.sandbox.appendChild(link);
        link.click();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should handle click on elements with internal tree", function() {
        const link = createLink("test" + Date.now());
        const i = document.createElement("i");

        i.textContent = "some content";
        link.appendChild(i);
        this.sandbox.appendChild(link);
        i.click();

        this.xhr = jasmine.Ajax.requests.mostRecent();

        expect(this.xhr).toBeDefined();
        expect(this.xhr.method).toBe("GET");
        expect(this.xhr.url).toBe(link.href);
    });
});
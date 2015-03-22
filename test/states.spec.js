describe("state", function() {
    "use strict";

    beforeEach(function() {
        jasmine.Ajax.install();

        this.sandbox = DOM.create("div#sandbox");

        DOM.find("body").append(this.sandbox);
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();

        this.sandbox.remove();

        this.xhr = null;
    });

    it("should be changed on ajaxify response with success status", function(done) {
        var link = DOM.mock("a[href=testsuccess]"),
            main = DOM.mock("main"),
            spy = spyOn(main, "remove");

        this.sandbox.append(main.append(link));

        link.fire("click");

        this.xhr = jasmine.Ajax.requests.mostRecent();
        this.xhr.respondWith({
            status: 200,
            contentType: "application/json",
            responseText: JSON.stringify({html: {main: "new content"}})
        });

        spy.and.callFake(function() {
            var sandbox = DOM.find("#sandbox");

            expect(sandbox.children("main").length).toBe(2);
            expect(sandbox.child(0).get()).toBe("new content");

            done();
        });
    });

    it("updates body for text responses", function(done) {
        var link = DOM.mock("a[href=testbody]");

        this.sandbox.append(link);

        link.fire("click");
        link.on("ajaxify:change", function(state) {
            expect(state).toEqual(jasmine.objectContaining({
                html: {body: "foo"}
            }));

            done();

            return false;
        });

        this.xhr = jasmine.Ajax.requests.mostRecent();
        this.xhr.respondWith({
            status: 200,
            contentType: "text/plain",
            responseText: "foo"
        });
    });

    it("should be changed on ajaxify response with error status", function(done) {
        var link = DOM.mock("a[href=testerror]"),
            main = DOM.mock("main"),
            spy = spyOn(main, "remove");

        this.sandbox.append(main.append(link));

        link.fire("click");

        this.xhr = jasmine.Ajax.requests.mostRecent();
        this.xhr.respondWith({
            status: 500,
            contentType: "application/json",
            responseText: JSON.stringify({html: {main: "error page"}})
        });

        spy.and.callFake(function() {
            var sandbox = DOM.find("#sandbox");

            expect(sandbox.children("main").length).toBe(2);
            expect(sandbox.child(0).get()).toBe("error page");

            done();
        });
    });

    // it("should switch to stored state if it exists", function(done) {
    //     var currentUrl = location.href,
    //         main = DOM.mock("main"),
    //         spy = spyOn(main, "remove");

    //     this.sandbox.append(main);

    //     DOM.fire("ajaxify:get", "changestate");

    //     this.xhr = jasmine.Ajax.requests.mostRecent();
    //     this.xhr.respondWith({
    //         status: 200,
    //         contentType: "application/json",
    //         responseText: JSON.stringify({html: {main: "changestate"}})
    //     });

    //     spy.and.callFake(function() {
    //         // have to use setTimeout because of stack overflow
    //         setTimeout(function() {
    //             DOM.fire("ajaxify:history", currentUrl);

    //             expect(jasmine.Ajax.requests.count()).toBe(1);

    //             done();
    //         }, 50);
    //     });
    // });

    it("should allow multiple requests for DOM", function() {
        DOM.fire("ajaxify:get", "url1", null);
        DOM.fire("ajaxify:get", "url2");

        expect(jasmine.Ajax.requests.count()).toBe(2);
    });
});

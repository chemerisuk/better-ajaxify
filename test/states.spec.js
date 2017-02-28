describe("state", function() {
    "use strict";

    beforeEach(function() {
        jasmine.Ajax.install();

        // this.sandbox = DOM.create("div#sandbox");
        // this.randomUrl = String(Date.now());

        // DOM.find("body").append(this.sandbox);
    });

    afterEach(function() {
        jasmine.Ajax.uninstall();

        // this.sandbox.remove();

        // this.xhr = null;
    });


    function dispatchAjaxifyEvent(el, eventType, eventDetail) {
        const e = document.createEvent("CustomEvent");

        e.initCustomEvent("ajaxify:" + eventType, true, true, eventDetail || null);

        return el.dispatchEvent(e);
    }
//     it("should be changed on ajaxify response with success status", function(done) {
//         var link = DOM.mock("a[href=testsuccess]"),
//             main = DOM.mock("main"),
//             spy = spyOn(main, "remove");

//         this.sandbox.append(main.append(link));

//         link.fire("click");

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         this.xhr.respondWith({
//             status: 200,
//             contentType: "application/json",
//             responseText: JSON.stringify({html: {main: "new content"}})
//         });

//         spy.and.callFake(function() {
//             var sandbox = DOM.find("#sandbox");

//             expect(sandbox.children("main").length).toBe(2);
//             expect(sandbox.child(0).get()).toBe("new content");

//             done();
//         });
//     });

//     it("updates body for text responses", function(done) {
//         var link = DOM.mock("a[href=testbody]");

//         this.sandbox.append(link);

//         link.fire("click");
//         link.on("ajaxify:load", function(state) {
//             expect(state).toEqual(jasmine.objectContaining({
//                 html: {body: "foo"}
//             }));

//             done();

//             return false;
//         });

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         this.xhr.respondWith({
//             status: 200,
//             contentType: "text/plain",
//             responseText: "foo"
//         });
//     });

//     it("should be changed on ajaxify response with error status", function(done) {
//         var link = DOM.mock("a[href=testerror]"),
//             main = DOM.mock("main"),
//             spy = spyOn(main, "remove");

//         this.sandbox.append(main.append(link));

//         link.fire("click");

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         this.xhr.respondWith({
//             status: 500,
//             contentType: "application/json",
//             responseText: JSON.stringify({html: {main: "error page"}})
//         });

//         spy.and.callFake(function() {
//             var sandbox = DOM.find("#sandbox");

//             expect(sandbox.children("main").length).toBe(2);
//             expect(sandbox.child(0).get()).toBe("error page");

//             done();
//         });
//     });

//     it("listens to browser history changes", function(done) {
//         var sandbox = this.sandbox;

//         sandbox.append(DOM.mock("main"));

//         DOM.fire("ajaxify:get", this.randomUrl);

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         this.xhr.respondWith({
//             status: 200,
//             contentType: "application/json",
//             responseText: JSON.stringify({html: {main: "foo"}})
//         });

//         setTimeout(function() {
//             expect(sandbox.find("main").value()).toBe("foo");

//             history.back();

//             setTimeout(function() {
//                 expect(sandbox.find("main").value()).not.toBe("foo");

//                 done();
//             }, 60);
//         }, 30);
//     });

//     it("triggers error event for timed responses", function(done) {
//         var changeSpy = jasmine.createSpy("change");

//         DOM.once("ajaxify:load", changeSpy);
//         DOM.once("ajaxify:error", function() {
//             expect(changeSpy).not.toHaveBeenCalled();

//             DOM.off("ajaxify:load", changeSpy);

//             done();
//         });

//         DOM.fire("ajaxify:get", this.randomUrl);

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         this.xhr.respondWith({
//             status: 0,
//             contentType: "text/plain",
//             responseText: ""
//         });
//     });

    it("should allow multiple requests for DOM", () => {
        dispatchAjaxifyEvent(document, "fetch", "url1");
        dispatchAjaxifyEvent(document, "fetch", "url2");

        expect(jasmine.Ajax.requests.count()).toBe(2);
    });
});

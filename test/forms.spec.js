// describe("form", function() {
//     "use strict";

//     beforeEach(function() {
//         jasmine.Ajax.install();

//         this.sandbox = DOM.create("div");
//         this.randomUrl = String(Date.now());

//         DOM.find("body").append(this.sandbox);
//     });

//     afterEach(function() {
//         jasmine.Ajax.uninstall();

//         this.sandbox.remove();

//         this.xhr = null;
//     });

//     it("should send AJAX request for GET method", function() {
//         var form = DOM.mock("form[action=`{0}`]", [this.randomUrl]);

//         this.sandbox.append(form);

//         form.fire("submit");

//         this.xhr = jasmine.Ajax.requests.mostRecent();

//         expect(this.xhr).toBeDefined();
//         expect(this.xhr.readyState).toBe(2);
//         expect(this.xhr.method).toBe("GET");
//         expect(this.xhr.url.indexOf(form.get("action"))).toBe(0);
//     });

//     it("should send AJAX request for POST method", function() {
//         var form = DOM.mock("form[method=post]");

//         this.sandbox.append(form);

//         form.set("action", location.href).fire("submit");

//         this.xhr = jasmine.Ajax.requests.mostRecent();

//         expect(this.xhr).toBeDefined();
//         expect(this.xhr.readyState).toBe(2);
//         expect(this.xhr.method).toBe("POST");
//         expect(this.xhr.url.indexOf(form.get("action"))).toBe(0);
//     });

//     it("should skip canceled events", function() {
//         var form = DOM.mock("form[action=`{0}`]", [this.randomUrl]),
//             spy = jasmine.createSpy("click");

//         this.sandbox.append(form);

//         form.on("submit", spy.and.returnValue(false));
//         form.fire("submit");

//         expect(spy).toHaveBeenCalled();

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         expect(this.xhr).not.toBeDefined();
//     });

//     it("should skip elements with target", function(done) {
//         var form = DOM.mock("form[action=`{0}` target=`_blank`]", [this.randomUrl]);

//         document.onsubmit = function(e) {
//             expect(e.defaultPrevented).toBe(false);
//             e.preventDefault();
//             // cleanup
//             document.onsubmit = null;

//             done();
//         };

//         this.sandbox.append(form);

//         form.fire("submit");
//     });

//     describe("submit buttons", function() {
//         it("disabled until request is completed", function(done) {
//             var form = DOM.mock("form[action=`{0}`]>button[type=submit]", [this.randomUrl]),
//                 submit = form.child(0),
//                 spy = jasmine.createSpy("load").and.callFake(function() {
//                     expect(submit.get("disabled")).toBeFalsy();

//                     done();
//                 });

//             this.sandbox.append(form);

//             form.on("ajaxify:success", spy).fire("submit");

//             expect(submit.get("disabled")).toBeTruthy();

//             this.xhr = jasmine.Ajax.requests.mostRecent();
//             this.xhr.respondWith({
//                 status: 200,
//                 contentType: "application/json",
//                 responseText: JSON.stringify({html: {main: "success"}})
//             });
//         });

//         it("disabled only when ajaxify:send succeed", function() {
//             var form = DOM.mock("form[action=`{0}`]>button[type=submit]", [this.randomUrl]),
//                 submit = form.child(0),
//                 spy = jasmine.createSpy("start").and.returnValue(false);

//             this.sandbox.append(form);

//             form.on("ajaxify:send", spy);
//             form.fire("submit");

//             expect(submit.get("disabled")).toBeFalsy();
//         });
//     });
// });

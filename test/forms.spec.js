// describe("form", function() {
//     "use strict";

//     function createForm(url) {
//         const form = document.createElement("form");
//         const submitBtn = document.createElement("button");

//         submitBtn.type = "submit";

//         form.appendChild(submitBtn);

//         if (url !== null) {
//             form.setAttribute("action", url);
//         }

//         return form;
//     }

//     beforeEach(function() {
//         jasmine.Ajax.install();

//         this.sandbox = document.createElement("div");
//         this.randomUrl = Math.random().toString(32).slice(2);

//         document.body.appendChild(this.sandbox);
//     });

//     afterEach(function() {
//         jasmine.Ajax.uninstall();

//         document.body.removeChild(this.sandbox);

//         this.xhr = null;
//     });

//     it("should send AJAX request for GET method", function() {
//         const form = createForm("test" + Date.now());

//         this.sandbox.appendChild(form);
//         form.querySelector("[type=submit]").click();

//         this.xhr = jasmine.Ajax.requests.mostRecent();

//         expect(this.xhr).toBeDefined();
//         expect(this.xhr.method).toBe("GET");
//         expect(this.xhr.url).toBe(form.action);
//     });

//     it("should send AJAX request for POST method", function() {
//         const form = createForm("test" + Date.now());

//         form.method = "POST";

//         this.sandbox.appendChild(form);
//         form.querySelector("[type=submit]").click();

//         this.xhr = jasmine.Ajax.requests.mostRecent();

//         expect(this.xhr).toBeDefined();
//         expect(this.xhr.method).toBe("POST");
//         expect(this.xhr.url).toBe(form.action);
//     });

//     it("should skip canceled events", function() {
//         const form = createForm("test" + Date.now());
//         const spy = jasmine.createSpy("click");

//         form.onsubmit = spy.and.returnValue(false);

//         this.sandbox.appendChild(form);
//         form.querySelector("[type=submit]").click();

//         expect(spy).toHaveBeenCalled();

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         expect(this.xhr).not.toBeDefined();
//     });

//     it("should skip elements with target", function(done) {
//         const form = createForm("test" + Date.now());

//         form.target = "_blank";
//         document.onsubmit = function(e) {
//             expect(e.defaultPrevented).toBe(false);
//             e.preventDefault();
//             // cleanup
//             document.onsubmit = null;

//             done();
//         };

//         this.sandbox.appendChild(form);
//         form.querySelector("[type=submit]").click();

//         this.xhr = jasmine.Ajax.requests.mostRecent();
//         expect(this.xhr).not.toBeDefined();
//     });
// });

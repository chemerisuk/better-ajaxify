describe("event", function() {
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

    describe("ajaxify:loadstart", function() {
        it("accepts config object for XHR", function() {
            var form = DOM.mock("form[action=test method=post]>input[name=a value=b]"),
                spy = jasmine.createSpy("loadstart");

            this.sandbox.append(form);

            form.on("ajaxify:loadstart", spy);
            form.fire("submit");

            expect(spy).toHaveBeenCalledWith({data: {a: "b"}}, form, form, false);
        });

        it("allows to prevent starting of AJAX request", function() {
            var form = DOM.mock("form[action=test method=post]>input[name=a value=b]"),
                spy = jasmine.createSpy("loadstart");

            this.sandbox.append(form);

            form.on("ajaxify:loadstart", spy.and.returnValue(false));
            form.fire("submit");

            expect(spy).toHaveBeenCalled();

            this.xhr = jasmine.Ajax.requests.mostRecent();
            expect(this.xhr).not.toBeDefined();
        });
    });

    describe("ajaxify:loadend", function() {
        it("should be fired on success", function(done) {
            var link = DOM.mock("a[href=test]"),
                spy = jasmine.createSpy("loadend"),
                nextSpy = jasmine.createSpy("load");

            this.sandbox.append(link);

            link.on("ajaxify:loadend", spy.and.callThrough());
            link.on("ajaxify:load", nextSpy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.response({ status: 200 });

            spy.and.callFake(function() {
                expect(nextSpy).not.toHaveBeenCalled();

                done();
            });
        });

        it("should be fired on error", function(done) {
            var link = DOM.mock("a[href=test]"),
                spy = jasmine.createSpy("loadend"),
                nextSpy = jasmine.createSpy("error");

            this.sandbox.append(link);

            link.on("ajaxify:loadend", spy.and.callThrough());
            link.on("ajaxify:error", nextSpy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.response({ status: 400 });

            spy.and.callFake(function() {
                expect(nextSpy).not.toHaveBeenCalled();

                done();
            });
        });

        it("should allow to prevent next steps", function(done) {
            var link = DOM.mock("a[href=test]"),
                spy = jasmine.createSpy("loadend"),
                nextSpy = jasmine.createSpy("load");

            this.sandbox.append(link);

            link.on("ajaxify:loadend", spy.and.returnValue(false));
            link.on("ajaxify:load", nextSpy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.response({ status: 200 });

            spy.and.callFake(function() {
                expect(nextSpy).not.toHaveBeenCalled();

                done();
            });
        });

        it("should accept response object", function(done) {
            var link = DOM.mock("a[href=test]"),
                spy = jasmine.createSpy("loadend"),
                response = {
                    url: link.get("href"),
                    title: "title"
                };

            this.sandbox.append(link);

            link.on("ajaxify:loadend", spy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.response({
                status: 200,
                responseText: JSON.stringify(response)
            });

            spy.and.callFake(function() {
                response.ts = spy.calls.argsFor(0)[0].ts;

                expect(spy).toHaveBeenCalledWith(response, link, link, false);

                done();
            });
        });
    });

    describe("ajaxify:history", function() {
        it("should trigger fetching of non-stored states", function() {
            DOM.fire("ajaxify:history", "some-url");

            this.xhr = jasmine.Ajax.requests.mostRecent();

            expect(this.xhr).toBeDefined();
            expect(this.xhr.readyState).toBe(2);
            expect(this.xhr.method).toBe("GET");
            expect(this.xhr.url.indexOf("some-url")).toBe(0);
        });
    });
});

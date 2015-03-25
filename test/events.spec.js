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

    describe("ajaxify:send", function() {
        it("accepts config object for XHR", function() {
            var form = DOM.mock("form[action=test method=post]>input[name=a value=b]"),
                spy = jasmine.createSpy("loadstart");

            this.sandbox.append(form);

            form.on("ajaxify:send", spy);
            form.fire("submit");

            expect(spy).toHaveBeenCalledWith({data: {a: "b"}, cacheBurst: false});
        });

        it("allows to prevent starting of AJAX request", function() {
            var form = DOM.mock("form[action=test method=post]>input[name=a value=b]"),
                spy = jasmine.createSpy("loadstart");

            this.sandbox.append(form);

            form.on("ajaxify:send", spy.and.returnValue(false));
            form.fire("submit");

            expect(spy).toHaveBeenCalled();

            this.xhr = jasmine.Ajax.requests.mostRecent();
            expect(this.xhr).not.toBeDefined();
        });
    });

    describe("ajaxify:change", function() {
        var dummyResponse = JSON.stringify({foo: "bar"});

        it("should be fired on success", function(done) {
            var link = DOM.mock("a[href=test444]"),
                spy = jasmine.createSpy("done"),
                nextSpy = jasmine.createSpy("load");

            this.sandbox.append(link);

            link.on("ajaxify:change", spy.and.callThrough());
            link.on("ajaxify:success", nextSpy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.respondWith({
                status: 200,
                responseText: JSON.stringify({foo: "bar"}),
                contentType: "application/json"
            });

            spy.and.callFake(function() {
                expect(nextSpy).not.toHaveBeenCalled();

                done();
            });
        });

        it("should be fired on error", function(done) {
            var link = DOM.mock("a[href=test]"),
                spy = jasmine.createSpy("done"),
                nextSpy = jasmine.createSpy("error");

            this.sandbox.append(link);

            link.on("ajaxify:change", spy.and.callThrough());
            link.on("ajaxify:error", nextSpy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.respondWith({
                status: 400,
                responseText: dummyResponse,
                contentType: "application/json"
            });

            spy.and.callFake(function() {
                expect(nextSpy).not.toHaveBeenCalled();

                done();
            });
        });

        it("should allow to prevent next steps", function(done) {
            var link = DOM.mock("a[href=test]"),
                spy = jasmine.createSpy("done"),
                nextSpy = jasmine.createSpy("load");

            this.sandbox.append(link);

            link.on("ajaxify:change", spy.and.returnValue(false));
            link.on("ajaxify:success", nextSpy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.respondWith({
                status: 200,
                responseText: dummyResponse,
                contentType: "application/json"
            });

            spy.and.callFake(function() {
                expect(nextSpy).not.toHaveBeenCalled();

                done();
            });
        });

        it("does nothing when response was failed with an error", function(done) {
            var link = DOM.mock("a[href=nope]"),
                spy = jasmine.createSpy("done");

            this.sandbox.append(link);

            link.on("ajaxify:change", spy);
            link.on("ajaxify:error", function(err) {
                expect(err instanceof Error).toBe(true);
                expect(spy).not.toHaveBeenCalled();

                done();
            });

            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.respondWith({
                status: 200,
                responseText: "{1:1}",
                contentType: "application/json"
            });
        });

        it("should accept response object", function(done) {
            var link = DOM.mock("a[href=test]"),
                spy = jasmine.createSpy("done"),
                response = {
                    url: link.get("href"),
                    title: "title"
                };

            this.sandbox.append(link);

            link.on("ajaxify:change", spy);
            link.fire("click");

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.respondWith({
                status: 200,
                responseText: JSON.stringify(response),
                contentType: "application/json"
            });

            spy.and.callFake(function() {
                expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
                    url: link.get("href"),
                    title: "title",
                    status: 200
                }));

                done();
            });
        });
    });

    it("skips events with null url", function() {
        DOM.fire("ajaxify:get", null);

        expect(jasmine.Ajax.requests.count()).toBe(0);
    });

    it("doesn't allow double get requests with the same URL", function() {
        DOM.fire("ajaxify:get", "123");
        DOM.fire("ajaxify:get", "123");

        expect(jasmine.Ajax.requests.count()).toBe(1);
    });
});

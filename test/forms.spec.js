describe("form", function() {
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

    it("should send AJAX request for GET method", function() {
        var form = DOM.mock("form[action=test]");

        this.sandbox.append(form);

        form.fire("submit");

        this.xhr = jasmine.Ajax.requests.mostRecent();

        expect(this.xhr).toBeDefined();
        expect(this.xhr.readyState).toBe(2);
        expect(this.xhr.method).toBe("GET");
        expect(this.xhr.url.indexOf(form.get("action"))).toBe(0);
    });

    it("should send AJAX request for POST method", function() {
        var form = DOM.mock("form[action=test method=post]");

        this.sandbox.append(form);

        form.fire("submit");

        this.xhr = jasmine.Ajax.requests.mostRecent();

        expect(this.xhr).toBeDefined();
        expect(this.xhr.readyState).toBe(2);
        expect(this.xhr.method).toBe("POST");
        expect(this.xhr.url.indexOf(form.get("action"))).toBe(0);
    });

    it("should skip canceled events", function() {
        var form = DOM.mock("form[action=test]"),
            spy = jasmine.createSpy("click");

        this.sandbox.append(form);

        form.on("submit", spy.and.returnValue(false));
        form.fire("submit");

        expect(spy).toHaveBeenCalled();

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    it("should skip elements with target", function() {
        var form = DOM.mock("form[action=test target=_blank]");

        this.sandbox.append(form);

        form.fire("submit");

        this.xhr = jasmine.Ajax.requests.mostRecent();
        expect(this.xhr).not.toBeDefined();
    });

    describe("submit buttons", function() {
        it("should be disabled until request is completed", function(done) {
            var form = DOM.mock("form[action=test]>button[type=submit]"),
                submit = form.child(0),
                spy = jasmine.createSpy("load");

            this.sandbox.append(form);

            form.on("ajaxify:load", spy);
            form.fire("submit");

            expect(submit.get("disabled")).toBeTruthy();

            this.xhr = jasmine.Ajax.requests.mostRecent();
            this.xhr.respondWith({status: 200});

            spy.and.callFake(function() {
                expect(submit.get("disabled")).toBeFalsy();

                done();
            });
        });

        it("disabled only when ajaxify:loadstart succeed", function() {
            var form = DOM.mock("form[action=test]>button[type=submit]"),
                submit = form.child(0),
                spy = jasmine.createSpy("loadstart").and.returnValue(false);

            this.sandbox.append(form);

            form.on("ajaxify:loadstart", spy);
            form.fire("submit");

            expect(submit.get("disabled")).toBeFalsy();
        });
    });


});

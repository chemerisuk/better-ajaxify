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
});

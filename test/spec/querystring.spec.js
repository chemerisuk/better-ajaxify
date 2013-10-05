describe("toQueryString", function() {
    "use strict";

    var WAIT_FOR_WATCH_TIME = 50,
        sandbox = DOM.create("div#sandbox");

    function checkForm(html, checker) {
        it("should serialize " + html, function() {
            sandbox.set(html);

            waits(WAIT_FOR_WATCH_TIME);

            runs(checker);
        });
    }

    beforeEach(function() {
        sandbox = DOM.create("div#sandbox");

        DOM.find("body").append(sandbox);
    });

    afterEach(function() {
        sandbox.remove();
    });

    describe("form elements", function() {
        checkForm("<form id='f1'><input type='text' name='n1' value='v1'></form>", function() {
            expect(DOM.find("#f1").toQueryString()).toBe("n1=v1");
        });

        checkForm("<form id='f2'><input type='checkbox' name='n2' value='v2'></form>", function() {
            expect(DOM.find("#f2").toQueryString()).toBe("");
        });

        checkForm("<form id='f3'><input type='checkbox' name='n3' value='v3' checked></form>", function() {
            expect(DOM.find("#f3").toQueryString()).toBe("n3=v3");
        });

        checkForm("<form id='f4'><input type='radio' name='n4' value='v4'></form>", function() {
            expect(DOM.find("#f4").toQueryString()).toBe("");
        });

        checkForm("<form id='f5'><input type='radio' name='n5' value='v5' checked></form>", function() {
            expect(DOM.find("#f5").toQueryString()).toBe("n5=v5");
        });

        checkForm("<form id='f6'><select name='n6'><option value='v6'></option><option value='v66' selected></option></select></form>", function() {
            expect(DOM.find("#f6").toQueryString()).toBe("n6=v66");
        });

        checkForm("<form id='f7'><select name='n7' multiple><option value='v7' selected></option><option value='v77' selected></option></select></form>", function() {
            expect(DOM.find("#f7").toQueryString()).toBe("n7=v7&n7=v77");
        });

        checkForm("<form id='f8'><select name='n8'><option selected>v8</option></select></form>", function() {
            expect(DOM.find("#f8").toQueryString()).toBe("n8=v8");
        });

        checkForm("<form id='f9'><input type='hidden' name='n1' value='v1 v2'><input type='text' value='v2'></form>", function() {
            expect(DOM.find("#f9").toQueryString()).toBe("n1=v1+v2");
        });
    });

    describe("ignored form elements", function(){
        checkForm("<form id='f1'><input type='file' name='t'></form>", function() {
            expect(DOM.find("#f1").toQueryString()).toBe("");
        });

        checkForm("<form id='f2'><input type='submit' name='t'></form>", function() {
            expect(DOM.find("#f2").toQueryString()).toBe("");
        });

        checkForm("<form id='f3'><input type='reset' name='t'></form>", function() {
            expect(DOM.find("#f3").toQueryString()).toBe("");
        });

        checkForm("<form id='f4'><input type='button' name='t'></form>", function() {
            expect(DOM.find("#f4").toQueryString()).toBe("");
        });

        checkForm("<form id='a5'><button type='submit' name='t'></button></form>", function() {
            expect(DOM.find("#a5").toQueryString()).toBe("");
        });

        checkForm("<form id='f6'><fieldset name='t'></fieldset></form>", function() {
            expect(DOM.find("#f6").toQueryString()).toBe("");
        });
    });
});

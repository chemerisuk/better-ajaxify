describe("toQueryString", function() {
    "use strict";

    describe("form elements", function() {
        test("<form id='f1'><input type='text' name='n1' value='v1'></form>", "n1=v1");
        test("<form id='f2'><input type='checkbox' name='n2' value='v2'></form>", "");
        test("<form id='f3'><input type='checkbox' name='n3' value='v3' checked></form>", "n3=v3");
        test("<form id='f4'><input type='radio' name='n4' value='v4'></form>", "");
        test("<form id='f5'><input type='radio' name='n5' value='v5' checked></form>", "n5=v5");
        test("<form id='f6'><select name='n6'><option value='v6'></option><option value='v66' selected></option></select></form>", "n6=v66");
        test("<form id='f7'><select name='n7' multiple><option value='v7' selected></option><option value='v77' selected></option></select></form>", "n7=v7&n7=v77");
        test("<form id='f8'><select name='n8'><option selected>v8</option></select></form>", "n8=v8");
        test("<form id='f9'><input type='hidden' name='n1' value='v1 v2'><input type='text' value='v2'></form>", "n1=v1+v2");
    });

    describe("ignored form elements", function(){
        test("<form id='f1'><input type='file' name='t'></form>", "");
        test("<form id='f2'><input type='submit' name='t'></form>", "");
        test("<form id='f3'><input type='reset' name='t'></form>",  "");
        test("<form id='f4'><input type='button' name='t'></form>", "");
        test("<form id='a5'><button type='submit' name='t'></button></form>", "");
        test("<form id='f6'><fieldset name='t'></fieldset></form>", "");
    });

    function test(html, value) {
        it("should serialize " + html, function() {
            var form = DOM.mock(html);

            expect(form.toQueryString()).toBe(value);
        });
    }
});

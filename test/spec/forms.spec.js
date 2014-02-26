describe("forms", function() {
    "use strict";

    var spy, sandbox;

    beforeEach(function() {
        spy = spyOn(XMLHttpRequest.prototype, "send");
        sandbox = DOM.create("div");
        DOM.find("body").append(sandbox);
    });

    it("should skip submits in some cases", function() {
        var form = DOM.mock("<form target=_blank method='post'></form>"),
            spy2 = jasmine.createSpy("submit").and.returnValue(false);

        sandbox.append(form);

        DOM.on("submit", spy2);
        form.fire("submit");

        expect(spy).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();

        form = DOM.mock("<form onsubmit='return false'></form>");
        sandbox.append(form);

        DOM.on("submit", spy2);
        form.fire("submit");

        expect(spy).not.toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });

    it("should prevent default submits and send ajax-request instead", function() {
        var form = DOM.mock("<form action='test' method='post'><input name='1' value='2'></form>"),
            spy2 = jasmine.createSpy("submit").and.callFake(function(defaultPrevented) {
            expect(defaultPrevented).toBe(true);
            // cancel submit anyway
            return false;
        });

        sandbox.append(form);

        DOM.on("submit", spy2, ["defaultPrevented"]);
        form.fire("submit");

        expect(spy).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });

    it("should handle get forms too", function() {
        var form = DOM.mock("<form method='get' action='test?a=b'></form>"),
            spy2 = jasmine.createSpy("submit").and.callFake(function(defaultPrevented) {
            expect(defaultPrevented).toBe(true);
            // cancel submit anyway
            return false;
        });

        sandbox.append(form);

        DOM.on("submit", spy2, ["defaultPrevented"]);
        form.fire("submit");

        expect(spy).toHaveBeenCalled();
        expect(spy2).toHaveBeenCalled();
    });
});

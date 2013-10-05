describe("XMLHttpRequest", function() {
    "use strict";

    var sendSpy;

    beforeEach(function() {
        sendSpy = spyOn(XMLHttpRequest.prototype, "send");
        // openSpy = spyOn(XMLHttpRequest, "open");
        // onerrorSpy = spyOn(XMLHttpRequest, "onerror");
        // onreadystatechangeSpy = spyOn(XMLHttpRequest, "onreadystatechange");
    });

    it("should send GET XMLHttpRequest on ajaxify:fetch", function() {
        var openSpy = spyOn(XMLHttpRequest.prototype, "open"),
            setRequestHeaderSpy = spyOn(XMLHttpRequest.prototype, "setRequestHeader");

        DOM.fire("ajaxify:fetch", "11111");

        openSpy.andCallFake(function(type, url) {
            expect(type).toBe("GET");
            expect(url).not.toBe("11111");
            expect(url.indexOf("11111")).toBe(0);
            expect(this.onerror).toBeDefined();
        });

        expect(openSpy).toHaveBeenCalled();
        expect(setRequestHeaderSpy).toHaveBeenCalledWith("X-Requested-With", "XMLHttpRequest");
        expect(sendSpy).toHaveBeenCalledWith(null);
    });

    it("should trigger ajaxify:error on XHR error", function() {
        var spy = jasmine.createSpy("error");

        DOM.once("ajaxify:error", ["detail"], spy);

        sendSpy.andCallFake(function() {
            // trigger error
            this.onerror();

            expect(spy).toHaveBeenCalledWith(this);
        });

        DOM.fire("ajaxify:fetch", "22222");
        expect(sendSpy).toHaveBeenCalled();
    });

    it("should process XHR when it's done", function() {
        var spy = jasmine.createSpy("loadend");

        DOM.once("ajaxify:loadend", ["detail"], spy);

        sendSpy.andCallFake(function() {
            // request is not completed yet
            this.onreadystatechange();

            expect(spy).not.toHaveBeenCalled();

            // mark request as completed
            // this.readyState = 4;
            // this.onreadystatechange();

            // expect(spy).toHaveBeenCalledWith(this);
        });

        DOM.fire("ajaxify:fetch", "33333");
    });
});
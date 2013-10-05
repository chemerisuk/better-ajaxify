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

    describe("ajaxify:error", function() {
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

        it("should trigger ajaxify:error if XHR status ie not successfull", function() {
            var spy = jasmine.createSpy("error"),
                testStatus = function(xhr, status) {
                    xhr.onreadystatechange.call({readyState: 4, status: status});
                    expect(spy).toHaveBeenCalled();
                    spy.reset();
                };

            sendSpy.andCallFake(function() {
                DOM.on("ajaxify:error", ["detail"], spy);

                testStatus(this, 500);
                testStatus(this, 400);
                testStatus(this, 401);
                testStatus(this, 403);
                testStatus(this, 0);

                DOM.off("ajaxify:error", spy);
            });

            DOM.fire("ajaxify:fetch", "33333");
            expect(sendSpy).toHaveBeenCalled();
        });
    });

    it("should process XHR when it's done", function() {
        var spy = jasmine.createSpy("loadend");

        DOM.once("ajaxify:loadend", ["detail"], spy);

        sendSpy.andCallFake(function() {
            // request is not completed yet
            this.onreadystatechange();

            expect(spy).not.toHaveBeenCalled();

            // it's not possible to change readyState
            // so to handle this just call handler with a different context

            this.onreadystatechange.call({readyState: 4});
            expect(spy).toHaveBeenCalled();
        });

        DOM.fire("ajaxify:fetch", "33333");
    });
});
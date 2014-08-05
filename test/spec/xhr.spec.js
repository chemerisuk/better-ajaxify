describe("xhr", function() {
    "use strict";

    var sendSpy;

    beforeEach(function() {
        sendSpy = spyOn(XMLHttpRequest.prototype, "send");
        // openSpy = spyOn(XMLHttpRequest, "open");
        // onerrorSpy = spyOn(XMLHttpRequest, "onerror");
        // onreadystatechangeSpy = spyOn(XMLHttpRequest, "onreadystatechange");
    });

    it("should send GET XMLHttpRequest on ajaxify:get", function() {
        var openSpy = spyOn(XMLHttpRequest.prototype, "open"),
            setRequestHeaderSpy = spyOn(XMLHttpRequest.prototype, "setRequestHeader");

        DOM.fire("ajaxify:get", "11111");

        openSpy.and.callFake(function(type, url) {
            expect(type).toBe("GET");
            expect(url).not.toBe("11111");
            expect(url.indexOf("11111")).toBe(0);
            expect(this.onerror).toBeDefined();
        });

        expect(openSpy).toHaveBeenCalled();
        expect(setRequestHeaderSpy).toHaveBeenCalledWith("X-Requested-With", "XMLHttpRequest");
        expect(sendSpy).toHaveBeenCalledWith(null);
    });

    it("should allow to trigger it on element manually", function() {
        var link = DOM.mock("a[href=00000]"),
            form = DOM.mock("form[action=99999 method=post]>input[name=a value=b]"),
            openSpy = spyOn(XMLHttpRequest.prototype, "open"),
            setRequestHeaderSpy = spyOn(XMLHttpRequest.prototype, "setRequestHeader");

        DOM.find("body").append(link, form);


        openSpy.and.callFake(function(type, url) {
            expect(type).toBe("GET");
            expect(url.indexOf("00000") >= 0).toBe(true);
            expect(this.onerror).toBeDefined();
        });

        link.fire("ajaxify:get", link.get("href"));
        expect(openSpy).toHaveBeenCalled();
        expect(setRequestHeaderSpy).toHaveBeenCalledWith("X-Requested-With", "XMLHttpRequest");
        expect(sendSpy).toHaveBeenCalledWith(null);

        link.remove();

        openSpy.and.callFake(function(type, url) {
            expect(type).toBe("POST");
            expect(url.indexOf("99999") >= 0).toBe(true);
            expect(this.onerror).toBeDefined();
        });

        form.fire("ajaxify:post", form.get("action"), form.toQueryString());
        expect(openSpy).toHaveBeenCalled();
        expect(setRequestHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/x-www-form-urlencoded");
        expect(sendSpy).toHaveBeenCalledWith("a=b");

        form.remove();

        openSpy.calls.reset();
        setRequestHeaderSpy.calls.reset();
        sendSpy.calls.reset();

        DOM.fire("ajaxify:post", form.get("action"), {c: "d", e: 122});
        expect(openSpy).toHaveBeenCalled();
        expect(setRequestHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/x-www-form-urlencoded");
        expect(sendSpy).toHaveBeenCalledWith("c=d&e=122");
    });

    describe("ajaxify:error", function() {
        it("should trigger ajaxify:error on XHR error", function() {
            sendSpy.and.callFake(function() {
                var xhr = this,
                    spy = jasmine.createSpy("error").and.callFake(function(arg1, arg2) {
                        expect(this).toBe(DOM);
                        expect(arg1).toBeNull();
                        expect(arg2).toBe(xhr);
                    });

                DOM.once("ajaxify:error", spy);

                this.onerror();
                expect(spy).toHaveBeenCalled();
            });

            DOM.fire("ajaxify:get", "ajaxify:error");
            expect(sendSpy).toHaveBeenCalled();
        });

        it("should trigger ajaxify:error if XHR status ie not successfull", function() {
            var spy = jasmine.createSpy("error"),
                testStatus = function(xhr, status) {
                    xhr.onreadystatechange.call({readyState: 4, status: status});
                    expect(spy).toHaveBeenCalled();
                    spy.reset();
                };

            sendSpy.and.callFake(function() {
                DOM.on("ajaxify:error", spy);

                testStatus(this, 500);
                testStatus(this, 400);
                testStatus(this, 401);
                testStatus(this, 403);
                testStatus(this, 0);

                DOM.off("ajaxify:error", spy);
            });

            DOM.fire("ajaxify:get", "33333");
            expect(sendSpy).toHaveBeenCalled();
        });
    });

    describe("ajaxify:timeout", function() {
        it("should trigger ajaxify:timeout on XHR error", function() {
            sendSpy.and.callFake(function() {
                var xhr = this,
                    spy = jasmine.createSpy("timeout").and.callFake(function(data) {
                        expect(this).toBe(DOM);
                        expect(data).toBe(xhr);
                    });

                DOM.once("ajaxify:timeout", spy);

                this.ontimeout();
                expect(spy).toHaveBeenCalled();
            });

            DOM.fire("ajaxify:get", "ajaxify:timeout");
            expect(sendSpy).toHaveBeenCalled();
        });
    });

    describe("ajaxify:load", function() {
        it("should be triggerred if XHR status is successfull", function() {
            var spy = jasmine.createSpy("error");

            sendSpy.and.callFake(function() {
                spy.and.callFake(function(detail) {
                    expect(detail.html).toEqual("<a>test</a>");
                });

                DOM.on("ajaxify:load", spy);

                this.onreadystatechange.call({readyState: 4, status: 200, responseText: "<a>test</a>"});
                expect(spy).toHaveBeenCalled();
                spy.reset();

                var response = {
                    title: "test title",
                    url: "33333",
                    html: {
                        a: "asdasda",
                        b: "234234234"
                    }
                };

                spy.and.callFake(function(detail) {
                    response.ts = detail.ts;

                    expect(detail).toEqual(response);
                });

                this.onreadystatechange.call({readyState: 4, status: 304, responseText: JSON.stringify(response)});
                expect(spy).toHaveBeenCalled();
                spy.reset();

                DOM.off("ajaxify:load", spy);
            });

            DOM.fire("ajaxify:get", "33333");
            expect(sendSpy).toHaveBeenCalled();
        });

        // it("should populate response with defaults", function() {
        //     var spy = jasmine.createSpy("error");

        //     sendSpy.and.callFake(function() {
        //         DOM.once("ajaxify:load", spy);

        //         DOM.set("title", "ajaxify:load");

        //         var response = {};

        //         spy.and.callFake(function(detail) {
        //             expect(detail.title).toBe("ajaxify:load");
        //             expect(detail.url).toBe("44444");
        //             expect(detail.html).toEqual({});
        //         });

        //         this.onreadystatechange.call({readyState: 4, status: 304, responseText: JSON.stringify(response)});
        //         expect(spy).toHaveBeenCalled();
        //         spy.calls.reset();

        //         DOM.off("ajaxify:load", spy);
        //     });

        //     DOM.fire("ajaxify:fetch", "44444");
        //     expect(sendSpy).toHaveBeenCalled();
        // });
    });

    it("should process XHR when it's done", function() {
        var spy = jasmine.createSpy("loadend");

        DOM.once("ajaxify:loadend", spy);

        sendSpy.and.callFake(function() {
            // request is not completed yet
            this.onreadystatechange();

            expect(spy).not.toHaveBeenCalled();

            // it's not possible to change readyState
            // so to handle this just call handler with a different context

            this.onreadystatechange.call({readyState: 4});
            expect(spy).toHaveBeenCalled();
        });

        DOM.fire("ajaxify:fetch", "55555");
    });

    it("should not fire load event if loadend was canceled", function() {
        var spy = jasmine.createSpy("loadend").and.returnValue(false),
            loadSpy = jasmine.createSpy("load");

        DOM.once("ajaxify:loadend", spy);
        DOM.once("ajaxify:load", loadSpy);

        sendSpy.and.callFake(function() {
            // request is not completed yet
            this.onreadystatechange();

            expect(spy).not.toHaveBeenCalled();

            this.onreadystatechange.call({readyState: 4});
            expect(spy).toHaveBeenCalled();
            expect(loadSpy).not.toHaveBeenCalled();
        });

        DOM.fire("ajaxify:fetch", "55555");
    });
});
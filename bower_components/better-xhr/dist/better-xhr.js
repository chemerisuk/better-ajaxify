/**
 * @file src/better-xhr.js
 * @version 0.3.0 2014-09-15T20:40:37
 * @overview Better abstraction for XMLHttpRequest
 * @copyright Maksim Chemerisuk 2014
 * @license MIT
 * @see https://github.com/chemerisuk/better-xhr
 */
(function() {
    var global = this || window,
        toString = Object.prototype.toString,
        XHR = function(method, url, config) {
        config = config || {};

        var headers = config.headers || {},
            charset = "charset" in config ? config.charset : "UTF-8",
            cacheBurst = "cacheBurst" in config ? config.cacheBurst : XHR.defaults.cacheBurst,
            data = config.data;

        if (toString.call(data) === "[object Object]") {
            data = Object.keys(data).reduce(function(memo, key) {
                var name = encodeURIComponent(key),
                    value = data[key];

                if (Array.isArray(value)) {
                    value.forEach(function(value) {
                        memo.push(name + "=" + encodeURIComponent(value));
                    });
                } else {
                    memo.push(name + "=" + encodeURIComponent(value));
                }

                return memo;
            }, []).join("&").replace(/%20/g, "+");
        }

        if (typeof data === "string") {
            if (method === "get") {
                url += (~url.indexOf("?") ? "&" : "?") + data;

                data = null;
            } else {
                headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
        }

        if (toString.call(config.json) === "[object Object]") {
            data = JSON.stringify(config.json);

            headers["Content-Type"] = "application/json; charset=" + charset;
        }

        if (cacheBurst) {
            url += (~url.indexOf("?") ? "&" : "?") + cacheBurst + "=" + Date.now();
        }

        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();

            xhr.onabort = function() { reject(null) };
            xhr.ontimeout = function() { reject(null) };
            xhr.onerror = function() { reject(null) };
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    var status = xhr.status;

                    data = xhr.responseText;

                    try {
                        data = JSON.parse(data);
                    } catch (err) {}

                    if (status >= 200 && status < 300 || status === 304) {
                        resolve(data);
                    } else {
                        reject(data);
                    }
                }
            };

            xhr.open(method.toUpperCase(), url, true);
            xhr.timeout = config.timeout || XHR.defaults.timeout;

            Object.keys(XHR.defaults.headers).forEach(function(key) {
                if (!(key in headers)) {
                    headers[key] = XHR.defaults.headers[key];
                }
            });

            Object.keys(headers).forEach(function(key) {
                if (headers[key]) {
                    xhr.setRequestHeader(key, headers[key]);
                }
            });

            xhr.send(data);
        });
    },
    Promise;

    XHR.get = function(url, config) {
        return XHR("get", url, config);
    };

    XHR.post = function(url, config) {
        return XHR("post", url, config);
    };

    XHR.defaults = {
        timeout: 15000,
        cacheBurst: "_",
        headers: {
            "X-Requested-With": "XMLHttpRequest"
        }
    };

    if (typeof module !== "undefined" && module.exports) {
        Promise = require("promise-polyfill");

        module.exports = XHR;
    } else {
        Promise = global.Promise;

        global.XHR = XHR;
    }
})();

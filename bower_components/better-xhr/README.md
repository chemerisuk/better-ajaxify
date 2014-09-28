better-xhr [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url]
=========================
> Better abstraction for XMLHttpRequest

The goal for the project is to create simple to use, lightweight and `Promise`-based implementation for working with AJAX.

## API

```js
XHR.get("/test/url").then(function(response) {
    // do something with response
});

XHR.post("/test/modify/url", {data: {a: "b"}}).then(successCallback, errorCallback);

// or general method
XHR(method, url, config).then(success, fail)
```

Global `XHR` function returns a `Promise` object. `Promise` implementation relies on the [promise-polyfill](https://github.com/taylorhakes/promise-polyfill) project, check out the [article HTML5Rocks article](http://www.html5rocks.com/en/tutorials/es6/promises/) for details on it's API.

Installing
----------
Use [bower](http://bower.io/) to download the library with all required dependencies.

    bower install better-xhr

This will clone the latest version of the __better-xhr__ into the `bower_components` directory at the root of your project.

Then just append the following scripts on your page:

```html
<script src="bower_components/promise-polyfill/Promise.js"></script>
<script src="bower_components/better-dom/dist/better-xhr.js"></script>
```

## Configuration
You can modify `XMLHttpRequest` settings via properties of the `config` object.

| Property | Type    | Description |
| -------- | ------- | ----------- | 
| `data`   | `Object` or `String`| Specifies data that you want to send in AJAX request.<br><br>An object value is serialized via query string algorithm.<br><br>For `GET` requests `data` argument is appended directly to the request URL.<br><br>For non-`GET` requests it will be passed into the `XMLHttpRequest#send` call.<br><br>Adds `"Content-Type"` header with value `"application/x-www-form-urlencoded"` for non-`GET` requests</li> 
| `json`   | `Object` or `String` | Specifies JSON data for AJAX request.<br><br>An object value is serialized via `JSON.stringify`. <br><br>Adds `"Content-Type"` header with value `"application/json"`
| `headers` | `Object` | Specifies extra HTTP headers for request. You can drop any default header via setting it to `null`
| `cacheBurst` | `String` | Cache bursting parameter. Allows to specify name of the extra dummy argument that disables caching.<br><br>Default value: `"_"`
| `timeout` | `Number` | The argument specifies request timeout in miliseconds.<br><br>Default value: `15000`

## Defaults
`XHR.defaults` object contains all predefined default values. You can modify them on demand. For example:

```js
// set default timeout to 10 seconds
XHR.defaults.timeout = 10000; 

// add custom header for each request
XHR.defaults.headers["X-Auth-Token"] = "123";
```

## Browser support
#### Desktop
* Chrome
* Safari 6.0+
* Firefox 16+
* Internet Explorer 8+
* Opera 12.10+

#### Mobile
* iOS Safari 6+
* Android 2.3+
* Chrome for Android

[travis-url]: http://travis-ci.org/chemerisuk/better-xhr
[travis-image]: http://img.shields.io/travis/chemerisuk/better-xhr/master.svg

[coveralls-url]: https://coveralls.io/r/chemerisuk/better-xhr
[coveralls-image]: http://img.shields.io/coveralls/chemerisuk/better-xhr/master.svg

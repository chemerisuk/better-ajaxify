better-xhr [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url]
=========================
> Better abstraction for XMLHttpRequest

The goal for the project is to create simple and lightweight Promise-based implementation for AJAX.

## API

```js
XHR.get(url, config).then(...);
XHR.post(url, config).then(...);

// or general method
XHR(method, url, config).then(...)

```

Global `XHR` function returns `Promise` object. Promise implementation depends on the [promise-polyfill](https://github.com/taylorhakes/promise-polyfill) project.

## Configuration
Configuration of the `XHR` i inspired by excellent [request](https://github.com/mikeal/request) project. Basically it uses a plain object to specify any kind of metadata for the `XMLHttpRequest`.

| Property | Type    | Description |
| -------- | ------- | ----------- | 
| `headers` | `Object` | Specifies extra HTTP headers for request. You can drop any default header via setting it to `null`
| `data`   | `Object` or `String`| Specifies data that you want to send in AJAX request.<br><br>An object value is serialized via query string algorithm.<br><br><ul><li>for `GET` requests `data` argument is appended directly to URL</li><li>otherwise is will be passed into the `XMLHttpRequest#send` call and `"Content-Type"` will be `"application/x-www-form-urlencoded"`</li> 
| `json`   | `Object` or `String` | Specifies JSON data for AJAX request.<br><br>An object value is serialized via `JSON.stringify`. <br><br>Adds `"Content-Type"` header with value `"application/json; charset=UTF-8"`
| `cacheBurst` | `String` | Cache bursting parameter. Allows to specify name of the extra dummy argument that disables caching.<br><br>Default value: `"_"`
| `timeout` | `Number` | The argument specifies request timeout in miliseconds.<br><br>Default value: `15000`

## Defaults
Use `XHR.defaults` objects to specify your own or override predefine default values. For example:

```
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
* Opera 12.10+
* IE8+

#### Mobile
* iOS Safari 6+
* Android 2.3+
* Chrome for Android

[travis-url]: http://travis-ci.org/chemerisuk/better-xhr
[travis-image]: http://img.shields.io/travis/chemerisuk/better-xhr/master.svg

[coveralls-url]: https://coveralls.io/r/chemerisuk/better-xhr
[coveralls-image]: http://img.shields.io/coveralls/chemerisuk/better-xhr/master.svg

better-ajaxify [![Build Status](https://api.travis-ci.org/chemerisuk/better-ajaxify.png?branch=master)](http://travis-ci.org/chemerisuk/better-ajaxify)
==============
> Ajax website engine for [better-dom](https://github.com/chemerisuk/better-dom)

[LIVE DEMO](http://chemerisuk.github.io/better-ajaxify/)

Installing
----------
Use [bower](http://bower.io/) to download this extension with all required dependencies.

    bower install better-ajaxify

This will clone the latest version of the __better-ajaxify__ into the `bower_components` directory at the root of your project.

Then append the following html elements on your page:

```html
<html>
<head>
    ...
    <!--[if IE]><script src="bower_components/html5shiv/dist/html5shiv.js"></script><![endif]-->
</head>
<body>
    ...
    <script src="bower_components/better-dom/better-dom.js" data-htc="bower_components/better-dom/better-dom.htc"></script>
    <script src="bower_components/better-ajaxify/dist/better-ajaxify.js"></script>
</body>
</html>
```

Depending on requirements you also need to include `better-ajaxify-pushstate.js` or `better-ajaxify-hashchange.js`. The first file implements havigation via [HTML5 History API](https://developer.mozilla.org/en/docs/DOM/Manipulating_the_browser_history) and this is preferred option for a website, because it's SEO-friendly. The second uses hash to indicate current state, so it could be useful for web applications.

Frontend setup
--------------
Custom `data-ajaxify` attribute is used to mark html elements that may be reloaded dynamically. The value of this attribute is a key of the `html` object in json response from server.

```html
...
<nav data-ajaxify="menu"></nav>
...
<div data-ajaxify="content"></div>
...
```

Backend setup
-------------
Server should respond in json format:

    {
        "title": "Page title",
        "url": "Optional page url, for a case when request and response urls should be different",
        "html": {
            "menu": "HTML string for menu",
            "content": "HTML string for content",
            ...
        }
    }

For History API case It's useful to check for existance of the `X-Requested-With` header if website needs to support direct links, and return json only if a request has it.
Custom events
-------------
The library exposes custom events below for advanced interaction:

* `ajaxify:fetch` is triggered every time a new content is loaded. `target` of this event is the element that fired loading a new page. The event could be used programmatically, for example `DOM.fire("ajaxify:fetch", url_to_load)`
* `ajaxify:loadstart` is triggered before doing an ajax call. `detail` if this event is particular instance of XMLHttpRequest object. It can be used for advanced configuration, like adding request headers via calling `xhr.setRequestHeader` method etc.
* `ajaxify:loadend` is triggered after an every ajax call. `detail` if this event is particular instance of XMLHttpRequest object
* `ajaxify:load` is triggered only if server returned succesfull response code. In this case library tries to parse `responseText` via `JSON.parse` if possible so `detail` of this event may be a javascript object of raw response string
* `ajaxify:history` is triggered when a user navigates through history in browser. `detail` of this event is target history entry url
* `ajaxify:error` is triggered only if server returned unsuccesfull response code. `detail` if this event is particular instance of XMLHttpRequest object
* `ajaxify:abort` is triggered when response was cancelled because of timeout. Timeout is not configurable for now and it equals to 15 seconds

Browser support
---------------
* Chrome
* Safari 5.2.2+
* Firefox 16+
* Opera 12.10+
* IE8+

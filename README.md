# better-ajaxify [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url]
> Pjax website engine for [better-dom](https://github.com/chemerisuk/better-dom)

[LIVE DEMO](http://chemerisuk.github.io/better-ajaxify/)

## Features
* handles `<a>` and `<form>` elements and sends ajax requests instead
* respects the `target` attribute on `<a>` or `<form>`
* fastclick support on mobile devices via checking `<meta name="viewport" content="width=device-width">`
* `pushstate` or `hashchange` could be used to update address bar
* advanced configuration via [custom events](#custom-events)
* [page transition animations](#animations-support) support via CSS3
* programmatic access via the custom `ajaxify:fetch` event
* prevents [multiple clicks](#multiclick-fix) on the same element
* makes submit buttons to be `[disabled]` until the request is completed

## Installing
Use [bower](http://bower.io/) to download this extension with all required dependencies.

    bower install better-ajaxify --save

This will clone the latest version of the __better-ajaxify__ into the `bower_components` directory at the root of your project.

Then append the following html elements on your page:

```html
<html>
<head>
    ...
    <!--[if IE]>
        <link href="bower_components/better-dom/dist/better-dom-legacy.htc" rel="htc"/>
        <script src="bower_components/better-dom/dist/better-dom-legacy.js"></script>
    <![endif]-->
</head>
<body>
    ...
    <script src="bower_components/better-dom/dist/better-dom.js"></script>
    <script src="bower_components/better-ajaxify/dist/better-ajaxify.js"></script>
</body>
</html>
```

Depending on requirements you usually have to include `better-ajaxify-pushstate.js` or `better-ajaxify-hashchange.js`. The first script implements navigation via [HTML5 History API](https://developer.mozilla.org/en/docs/DOM/Manipulating_the_browser_history), the second uses __hashchange__ to indicate current state.

## Frontend/backend setup
Custom `data-ajaxify` attribute is used to mark html elements that might be reloaded dynamically. The value of this attribute is a key of the `html` object in json response from server.

```html
...
<nav data-ajaxify="menu"></nav>
...
<div data-ajaxify="content"></div>
...
```
Server should respond in json format:

    {
        "title": "Page title",
        "url": "Optional page url, for a case when request and response urls should be different",
        "html": {
            "menu": "innerHTML content for [data-ajaxify=menu] element",
            "content": "innerHTML content for [data-ajaxify=content] element",
            ...
        }
    }

For History API case It's useful to check for existance of the `X-Requested-With` header if website needs to support direct links, and return json only if a request has it.

### Multiclick fix
The library prevents user from clicking on the same element twice. All repeated actions will be skipped.

Additionally for forms all submit buttons become to be `[disabled]` until the submit request is completed (or failed). So you could use css to style these buttons (for example by adding a cool spinner to indicate that request is in progress).

### Animations support
Each content transition could be animated. Just use [common approach for animations in better-dom](http://jsfiddle.net/C3WeM/4/) on apropriate elements to enable them:

```css
[data-ajaxify=content] {
    opacity: 1;
    /* enable animations via CSS3 transition property */
    -webkit-transition: opacity 0.3s ease-in;
    transition: opacity 0.3s ease-in;
}

[data-ajaxify=content][aria-hidden=true] {
    display: table-cell; /* override display:none */
    opacity: 0;
}

/* style element which is going to be hidden */
[data-ajaxify=content] + [data-ajaxify=content] {
    position: absolute;
    left: 200px;

    -webkit-transition-delay: 0.15s;
    transition-delay: 0.15s;
}
```

## Custom events
The library exposes multiple custom events for advanced interaction.

#### ajaxify:fetch `URL[, callback(response)]`
Triggered every time a new content is loaded. `target` of this event is the element that is firing loading a new page (usually link or form). The event could be triggered programmatically, for example `DOM.fire("ajaxify:fetch", url)`. It also supports function callback instead of url.

#### ajaxify:loadstart `XMLHttpRequest`
Triggered before doing an ajax call. `data` if this event is particular instance of the `XMLHttpRequest` object. Could be used for advanced configuration, like adding request headers via calling `xhr.setRequestHeader` method etc. If any handler prevents default behavior then no request will be sent.

#### ajaxify:loadend `XMLHttpRequest`
Triggered when an ajaxify request is completed (successfully or not)

#### ajaxify:load `response`
Triggered only if server responsed with succesfull status code. In this case library tries to parse `responseText` via `JSON.parse` if possible so `data` of this event may be a javascript object of raw response string

#### ajaxify:history `URL`
Triggered when a user navigates through history in browser. `data` of this event is target history entry url

#### ajaxify:error `XMLHttpRequest`
Triggered only if server returned unsuccesfull response code

#### ajaxify:timeout `XMLHttpRequest`
Triggered when request was cancelled because of timeout. Timeout is not configurable for now and it equals to 15 seconds

#### ajaxify:abort `XMLHttpRequest`
Triggered when request was aborted. It may happen when user clicks on a link before previous request was completed

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

[travis-url]: http://travis-ci.org/chemerisuk/better-ajaxify
[travis-image]: https://api.travis-ci.org/chemerisuk/better-ajaxify.png?branch=master

[coveralls-url]: https://coveralls.io/r/chemerisuk/better-ajaxify
[coveralls-image]: https://coveralls.io/repos/chemerisuk/better-ajaxify/badge.png?branch=master

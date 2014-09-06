# better-ajaxify [![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url]
> Ajax website engine for [better-dom](https://github.com/chemerisuk/better-dom)

The library helps to solve one of the most important problem for a typical website: improving performance. There is a term called "Full AJAX" that means a library that makes a regular HTTP links or forms to be AJAXified. After including the library on page and simple adaptation on backend each navigation change triggers an partial page reload which is always faster than full page refresh and allows to save a use state on client side as well.

[LIVE DEMO](http://chemerisuk.github.io/better-ajaxify/)

## Features
* handles `<a>` and `<form>` elements and sends ajax requests instead
* respects the `target` attribute on `<a>` or `<form>`
* fastclick support on mobile devices via checking `<meta name="viewport" content="width=device-width">`
* [`pushstate` or `hashchange`](#determine-strategy-for-browser-history) can be used to update browser address bar
* [page transition animations](#animate-page-transitions-in-css) support via CSS3
* prevents [multiple form submits](#style-disabled-submit-buttons) until the request is completed
* advanced configuration and manipulation via [custom events](#custom-events)

## Installing
Use [bower](http://bower.io/) to download this extension with all required dependencies.

    bower install better-ajaxify

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

## Frontend setup

### Determine strategy for browser history
There are two main strategies that allows you to work with browser history (so back/forward buttons will work properly): using [HTML5 History API](https://developer.mozilla.org/en/docs/DOM/Manipulating_the_browser_history) or via __hashchange__ event. Each has it's own advantages and disadvantages.

__HTML5 History API__:
+ performance: initial page load always takes a single request 
+ clear and SEO-friendly address bar urls
+ you can use archors on your page as in regular case
- there are some quirks in several old implementations (but all of them are solved in modern browsers)
- some old browsers do [not support the HTML5 History API](http://caniuse.com/#search=push). Also early Android 4 has [lack of support](https://code.google.com/p/android/issues/detail?id=23979) as well.

Using __hashchange__ event:
+ [great browser support](http://caniuse.com/#search=hashchange)
+ consistent support in all browsers
- urls have to start with `#` that looks weird and is not a SEO-frieldly
- internal page loading takes two requests instead of single one (there are some tricks to avoid that in some cases but in general the rule is truthy)
- you should put anchors carefully because they used for page navigation as well

Therefore depending on project requirements you have to include extra `better-ajaxify-pushstate.js` or `better-ajaxify-hashchange.js` file on your page. I'd recommend to use the first strategy when possible. It's a future proof and the most transparent for client and server.

### Animate page transitions in CSS
Each content transition can be animated. Just use [common approach for animations in better-dom](http://jsfiddle.net/C3WeM/4/) on apropriate elements to enable them:

```css
/* style main content container */
main {
    transform: translateX(0);
    transition: transform 0.25s ease-in-out;
}

/* style element which is going to be hidden */
main + main {
    position: absolute;
    top: 0;
    left: 0;
}

/* style forward animation */
main[aria-hidden=true] {
    transform: translateX(100%);
}

/* style backward animation */
main + main[aria-hidden=true] {
    transform: translateX(-100%);
}
```

Note: the animations may respect page history direction. For instance, the animation above varies depending on which browser button was pressed: backward or forward.

### Style disabled submit buttons
In vanilla HTML there is an annoying issue that user is able to click a submit button while form is submitting. The library fixes it by applying the `disabled` attribute while form request is in progress. So you can use this feature to style such buttons to improve UX:

```css
[type=submit][disabled] {
    background-image: url(spinner.gif) no-repeat center right;
}
```

### Setup analytics
It's pretty straightforward to setup analytics via [custom events](#custom-events). Any successful page load triggers `ajaxify:load` event, so you can use it to notify Google Analytics for instance about each page load:

```js
// Google Analytics setup
DOM.on("ajaxify:load", function(response) {
    window.ga("send", "pageview", {
        title: response.title,
        page: response.url
    });
});
```

## Backend setup
In order to make it work you need to modify your web server to return JSON response for ajaxify. The format of this response is pretty straighforward:

    {
        "title": "Page title",
        "url": "Optional page url, if you need to update address url additionally",
        "html": {
            "main": "innerHTML content for the main content",
            ...
        }
    }

The client part parses such response and uses keys of the `html` object as CSS selectors to find the area on your page to update. Value is used to update `innerHTML` property.

### Example of Node configuration using express.js
This example uses Handlebars for rendering HTML on backend. 

#### Use layouts
Make sure you understand how to change [layouts in Handlebars](https://github.com/barc/express-hbs#syntax) for example.

So your `layout.hbs` might look like:

```html
<!DOCTYPE html>
<html lang="{{locale}}">
<head>
    <meta charset="UTF-8">
    <title>{{title}}</title>
    <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
    <main>{{{body}}}</main>
    <script src="/js/scripts.js"></script>
</body>
</html>
```

Our application contains dynamic content inside of the `<main>` element.

#### Introduce JSON layout
Add `layout.json` to return ajaxify output:

```html
{
    {{#if title}}"title": "{{title}}",
    {{/if}}{{#if url}}"url": "{{url}}",
    {{/if}}"html": {
        "main": "{{{BODY}}}"
    }
}
```

#### Switch layouts depending on request type
Now the trick. Add extra middleware to use appropriate layout based on `X-Http-Requested-With` header:

```js
app.use(function(req, res, next) {
    if (req.xhr) {
        app.set("view options", {layout: "layout.json"});
        res.set("Content-Type", "application/json");
    } else {
        app.set("view options", {layout: "layout.hbs"});
        res.set("Content-Type", "text/html");
    }

    next();
});
```

#### Fix redirects
`XMLHttpRequest` objects can handle redirects for you, but they do not provide a way to determine the final page URL. This is an important disadvantage, because we need to update browser address into the correct URL value.

To fix this issue you can use the `url` key that we have in JSON response for ajaxify. Just add one line below into a middleware to store the latest request url into a variable accessible for views:

```js
res.locals.url = req.protocol + "://" + req.get("host") + req.originalUrl;
```

I recommend to use full url value there, because it avoids problems related to cross-domain requests.

## Custom events
The library exposes multiple custom events for advanced interaction.

#### ajaxify:get `URL, callback`
Event is trigerred for each `GET` request. Argument `callback` is optional, it's used for making such requests manually:

```js
DOM.fire("ajaxify:get", "test_url", function(data) {
    // handle response data here
});
```

#### ajaxify:post `URL, query, callback`
Event is trigerred for each `POST` request. Argument `query` can be either `String` or `Object`, later it will be sent as a request data. Argument `callback` is optional, it's used for making such requests manually:

```js
var query = {param1: "a", param2: "b"};

DOM.fire("ajaxify:post", "test_url", query, function(data) {
    // handle response data here
});
```

#### ajaxify:loadstart `XMLHttpRequest`
Triggered before doing an ajax call. `data` if this event is particular instance of the `XMLHttpRequest` object. Could be used for advanced configuration, like adding request headers via calling `xhr.setRequestHeader` method etc. If any handler prevents default behavior then no request will be sent.

#### ajaxify:loadend `data, XMLHttpRequest`
Triggered when an ajaxify request is completed (successfully or not)

#### ajaxify:load `data, XMLHttpRequest`
Triggered only if server responsed with succesfull status code. In this case library tries to parse `responseText` via `JSON.parse` if possible so `data` of this event may be a javascript object of raw response string

#### ajaxify:history `URL`
Triggered when a user navigates through history in browser. `data` of this event is target history entry url

#### ajaxify:error `data, XMLHttpRequest`
Triggered only if server returned unsuccesfull response code

#### ajaxify:timeout `data, XMLHttpRequest`
Triggered when request was cancelled because of timeout. Timeout is not configurable for now and it equals to 15 seconds

#### ajaxify:abort `data, XMLHttpRequest`
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

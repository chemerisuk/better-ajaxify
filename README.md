# better-ajaxify<br>[![Build Status][travis-image]][travis-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Bower version][bower-image]][bower-url]
> Ajax website engine for [better-dom](https://github.com/chemerisuk/better-dom)

The library helps to solve the performance problem for HTML pages and also improves user experience. There is a term called "Full AJAX website" that defines a web site that instead of regular links or forms uses AJAX requests. After including an extra library on your page and simple adaptation on backend each navigation change triggers a **partial reload** instead of full refetching and rerendering of the whole page. That experience is always faster and nicer: user doesn't see white flashes, moreover you can show cool animations instead.

[LIVE DEMO](http://chemerisuk.github.io/better-ajaxify/)

## Features
* handles `<a>` and `<form>` elements and sends ajax requests instead
* respects the `target` attribute on `<a>` or `<form>`
* advanced configuration via [custom events](#custom-events)
* [page transition animations](#animate-page-transitions-in-css) support via CSS3
* prevents [multiple form submits](#style-disabled-submit-buttons) until the request is completed
* for browsers that [don't support HTML5 History API](http://caniuse.com/#search=history) standard fetch is used.
* `autofocus` attribute support

## Installing
Use [bower](http://bower.io/) to download this extension with all required dependencies.

```sh
$ bower install better-ajaxify
```

This will clone the latest version of the __better-ajaxify__ into the `bower_components` directory at the root of your project.

Then append the following html elements on your page:

```html
<script src="bower_components/better-dom/dist/better-dom.js"></script>
<script src="bower_components/better-ajaxify/dist/better-ajaxify.js"></script>
```

## Frontend setup
Starting from version 1.7 only [HTML5 History API](https://developer.mozilla.org/en/docs/DOM/Manipulating_the_browser_history) is supported to manage browser history.

### Custom events
The library exposes several custom events for advanced interaction.

| Event name | Arguments | Description |
| ---------- | --------- | ----------- |
| `ajaxify:get` | `url` | Event is trigerred for each `GET` request. |
| `ajaxify:post`<br>`ajaxify:put`<br>`ajaxify:delete`<br>`ajaxify:patch` | `url`, `data` | Event is trigerred for each request other than `GET`. Argument `data` can be either `String` or `Object`, later it will be passed as a request data. |
| `ajaxify:loadstart` | `config` | Triggered before doing an ajax call. `config` of this event will be passed into `XHR` object instance. is particular instance of the `XMLHttpRequest` object. See [details](https://github.com/chemerisuk/better-xhr#configuration) about possible configuration. If any handler prevents default behavior then no request will be sent. |
| `ajaxify:loadend` | `response` | Triggered when an ajaxify request is completed (successfully or not). |
| `ajaxify:load` | `response` | Triggered only if server responsed with succesfull status code. In this case library tries to parse `responseText` via `JSON.parse` if possible so `response` of this event may be a javascript object of raw response string. |
| `ajaxify:error` | `response` | Triggered if server returned unsuccesfull response code or there was other cause of failing. |
| `ajaxify:history` | `url` | Triggered when a user navigates through history in browser. |

Below is an example how you can setup Google Analytics using `ajaxify:load` event:

```js
// Google Analytics setup
DOM.on("ajaxify:load", function(state) {
    window.ga("send", "pageview", {
        title: state.title,
        page: state.url
    });
});
```

### Changing state on client side
Sometimes it's useful to change browser state on client side without requesting external resources. For instance when you already have cached/prefetched state in memory. To achieve that goal with ajaxify use custom event `ajaxify:loadend`.

This event is fired automatically for any new state fetched from a server. The first agrument for the event is the state object itself. Therefore to if you trigger it manually with appropriate object, result will be the same as for regular case:

```js
DOM.fire("ajaxify:loadend", {
    title: "foo",
    url: "/foo"
});
```

### Preventing default behavior
Links or forms that have the [`target` attribute](http://www.w3schools.com/tags/att_a_target.asp) are not AJAXified. Therefore you can use that attribute to avoid default behavior when necessary:

```html
<a href="/signin" target="_self">Signin without AJAX</a>
```

In case when changing markup is problematic, you can skip AJAXify behavior via cancelling appropriate `ajaxify:*` event. For links it's `ajaxify:get`, but the event name for forms corresponds to the value of the `method` attribute: 

```js
DOM.find("[href=/signin]").on("ajaxify:get", function() {
    // has the same effect as the target attribute
    return false;
});

DOM.find("[action=/register]").on("ajaxify:post", function() {
    // cancels a post form
    return false;
});
```

### Animating page transitions
Each content transition can be animated:

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

### Styling disabled submit buttons
In vanilla HTML there is an annoying issue that user is able to click a submit button while form is submitting. The library fixes it by applying the `disabled` attribute while form request is in progress. So you can use this feature to style such buttons to improve UX:

```css
[type=submit][disabled] {
    background-image: url(spinner.gif) no-repeat center right;
}
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
        res.set("Content-Type", "application/json; charset=utf-8");
    } else {
        app.set("view options", {layout: "layout.hbs"});
        res.set("Content-Type", "text/html; charset=utf-8");
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

## Browser support
#### Desktop
* Chrome
* Safari 6.0+
* Firefox 16+
* Opera 12.10+
* Internet Explorer 8+ (see [notes](https://github.com/chemerisuk/better-dom#notes-about-old-ies))

#### Mobile
* iOS Safari 6+
* Android 2.3+
* Chrome for Android

[travis-url]: http://travis-ci.org/chemerisuk/better-ajaxify
[travis-image]: http://img.shields.io/travis/chemerisuk/better-ajaxify/master.svg

[coveralls-url]: https://coveralls.io/r/chemerisuk/better-ajaxify
[coveralls-image]: http://img.shields.io/coveralls/chemerisuk/better-ajaxify/master.svg

[bower-url]: https://github.com/chemerisuk/better-ajaxify
[bower-image]: http://img.shields.io/bower/v/better-ajaxify.svg

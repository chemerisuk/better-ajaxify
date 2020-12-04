# better-ajaxify<br>[![NPM version][npm-version]][npm-url] [![NPM downloads][npm-downloads]][npm-url] [![Build Status][status-image]][status-url] [![Coverage Status][coveralls-image]][coveralls-url] [![Twitter][twitter-follow]][twitter-url]
> A simple PJAX engine for websites

The library helps to solve the performance problem for HTML pages and also improves user experience. There is a term called "Full AJAX website" that defines a web site that instead of regular links or forms uses AJAX requests. After including an extra library on your page and simple adaptation on backend each navigation change triggers a **partial reload** instead of full refetching and rerendering of the whole page. That experience is always faster and nicer: user doesn't see white flashes, moreover you can show cool animations instead.

[LIVE DEMO](http://chemerisuk.github.io/better-ajaxify/)

## Index

<!-- MarkdownTOC levels="2" autolink="true" -->

- [Installing](#installing)
- [Links](#links)
- [Forms](#forms)
- [Custom events](#custom-events)

<!-- /MarkdownTOC -->

## Installing
Library distributed via NPM:

```sh
$ npm install better-ajaxify --save-dev
```

This will clone the latest version of the __better-ajaxify__ into the `node_modules` directory at the root of your project.

Then append the following html elements on your page:

```html
<script src="node_modules/better-ajaxify/dist/better-ajaxify.js"></script>
```

## Links
HTML element <code>&lt;a&gt;</code> allows to navigate to a url. Library modifies this behavior to prevent a white flash. Request to server is made using <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">Fetch API</a>, and response body replaces the current document without a full page reload.

In some cases regular <code>&lt;a&gt;</code> behavior preserved:

* when <code>href</code> attribute value has only a hash;</li>
* when <code>&lt;a&gt;</code> has non-empty <code>target</code> attribute;</li>
* when <code>&lt;a&gt;</code> has non-<code>http(s)</code> url as the <code>href</code> attribute value (<code>tel:</code>, <code>mailto:</code> etc.).

To disable library for a particular <code>&lt;a&gt;</code> element you could also call method <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault" target="_blank"><code>Event#preventDefault</code></a> in the <code>click</code> event listener:

```js
myLink.addEventListener("click", function(e) {
  // call preventDefault to stop ajaxify from invoking a fetch request
  e.preventDefault();
}, false);
```

## Forms
HTML element <code>&lt;form&gt;</code> serializes user input data and to sumbits it to new server url specified in the <code>action</code> attribute. Then browser triggers full page reload with the new url. Library modifies this behavior to prevent a white flash. Request to server is made using <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">Fetch API</a>, and response body replaces the current document without a full page reload.

In some cases regular <code>&lt;form&gt;</code> behavior is not modified:

* when a <code>&lt;form&gt;</code> has non-empty <code>target</code> attribute;
* when a <code>&lt;form&gt;</code> has non-<code>http(s)</code> url as the <code>action</code> attribute value (<code>tel:</code>, <code>mailto:</code> etc.).
        
To disable library for a particular <code>&lt;form&gt;</code> element you could also call method <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault" target="_blank"><code>Event#preventDefault</code></a> in the <code>submit</code> event listener:

```js
myForm.addEventListener("submit", function(e) {
  // call preventDefault to stop ajaxify from invoking a fetch request
  e.preventDefault();
}, false);
```

## Custom events
The library introduces set of new custom events.

| Event name | Type of `Event#detail` | Description |
| ---------- | --------- | ----------- |
| `ajaxify:serialize` | [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) | Trigerred _only_ for forms and contains user input data |
| `ajaxify:fetch` | [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) | Trigerred when a navigation AJAX request starts |
| `ajaxify:load` | [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) | Trigerred when a navigation AJAX request ends |
| `ajaxify:error` | [`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) | Trigerred when an error happened during a navigation AJAX request |
| `ajaxify:render` | [`Document`](https://developer.mozilla.org/en-US/docs/Web/API/Document) | Triggered when the current page is ready to update visual state |

### `ajaxify:fetch`
Custom event `ajaxify:fetch` used to modify AJAX request construction under some obstacles. For instance code below uses `sessionStorage` as a cache source with responses from server so no network used for repeated requests:

```js
document.addEventListener("ajaxify:fetch", function(e) {
    const req = e.detail;
    // cache only GET responses
    if (req.method !== "GET") return;

    const html = sessionStorage[req.url];
    if (html) {
        e.preventDefault();
        // construct new Response object with cached response content
        const res = new Response(html);
        Object.defineProperty(res, "url", {get: () => req.url});
        
        const event = document.createEvent("CustomEvent");
        event.initCustomEvent("ajaxify:load", true, true, res);
        // fire ajaxify:load to continue flow of changing the current page state
        document.dispatchEvent(event);
    }
}, true);
```

### `ajaxify:load`
Custom event `ajaxify:load` used to modify how to process server responses. For instance code below stores a new key-value pair in `sessionStorage` to cache server responses on client side:

```js
document.addEventListener("ajaxify:load", function(e) {
    const res = e.detail;
    // cache only GET responses
    if (req.method !== "GET") return;
    
    if (res.ok && !res.bodyUsed) {
        res.clone().text().then(html => {
            sessionStorage[res.url] = html;
        });
    }
}, true);
```

[status-url]: https://github.com/chemerisuk/better-ajaxify/actions
[status-image]: https://github.com/chemerisuk/better-ajaxify/workflows/Node.js%20CI/badge.svg?branch=master

[coveralls-url]: https://coveralls.io/r/chemerisuk/better-ajaxify
[coveralls-image]: http://img.shields.io/coveralls/chemerisuk/better-ajaxify/master.svg

[npm-url]: https://www.npmjs.com/package/better-ajaxify
[npm-version]: https://img.shields.io/npm/v/better-ajaxify.svg
[npm-downloads]: https://img.shields.io/npm/dt/better-ajaxify.svg

[twitter-url]: https://twitter.com/chemerisuk
[twitter-follow]: https://img.shields.io/twitter/follow/chemerisuk.svg?style=social&label=Follow%20me


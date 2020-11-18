# better-ajaxify<br>[![Build Status][status-image]][status-url] [![Coverage Status][coveralls-image]][coveralls-url]
> A simple PJAX engine for websites

The library helps to solve the performance problem for HTML pages and also improves user experience. There is a term called "Full AJAX website" that defines a web site that instead of regular links or forms uses AJAX requests. After including an extra library on your page and simple adaptation on backend each navigation change triggers a **partial reload** instead of full refetching and rerendering of the whole page. That experience is always faster and nicer: user doesn't see white flashes, moreover you can show cool animations instead.

[LIVE DEMO](http://chemerisuk.github.io/better-ajaxify/)

## Index

<!-- MarkdownTOC levels="2" autolink="true" -->

- [Installing](#installing)
- [Links](#links)
- [Forms](#forms)
- [Custom events](#custom-events)
- [Browser support](#browser-support)

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

Methods from the list above can be used in markup. When you need to keep regular <code>&lt;a&gt;</code> behavior in JavaScript - call method <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault" target="_blank"><code>Event#preventDefault</code></a> inside your <code>click</code> event handler for an appropriate element.

## Forms
HTML element <code>&lt;form&gt;</code> serializes user input data and to sumbits it to new server url specified in the <code>action</code> attribute. Then browser triggers full page reload with the new url. Library modifies this behavior to prevent a white flash. Request to server is made using <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">Fetch API</a>, and response body replaces the current document without a full page reload.

In some cases regular <code>&lt;form&gt;</code> behavior is not modified:

* when a <code>&lt;form&gt;</code> has non-empty <code>target</code> attribute;
* when a <code>&lt;form&gt;</code> has non-<code>http(s)</code> url as the <code>action</code> attribute value (<code>tel:</code>, <code>mailto:</code> etc.).
        
Methods from the list above can be used in markup. When you need to keep regular <code>&lt;form&gt;</code> behavior in JavaScript - call method <a href="https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault" target="_blank"><code>Event#preventDefault</code></a> inside your <code>submit</code> event handler for an appropriate element.

## Custom events
The library exposes set of custom events for advanced interaction.

| Event name | Type of `Event#detail` | Description |
| ---------- | --------- | ----------- |
| `ajaxify:serialize` | [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) | Event is trigerred for forms only and contains user input data |
| `ajaxify:fetch` | [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) | Event is trigerred when a navigation AJAX request started with request details |
| `ajaxify:load` | [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) | Event is trigerred when a navigation AJAX request ends and contains server response data  |
| `ajaxify:render` | [`Document`](https://developer.mozilla.org/en-US/docs/Web/API/Document) | Triggered when a web page ready to update it's visual state to a new one |

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

[status-url]: https://github.com/chemerisuk/better-ajaxify/actions
[status-image]: https://github.com/chemerisuk/better-ajaxify/workflows/Node.js%20CI/badge.svg?branch=master

[coveralls-url]: https://coveralls.io/r/chemerisuk/better-ajaxify
[coveralls-image]: http://img.shields.io/coveralls/chemerisuk/better-ajaxify/master.svg

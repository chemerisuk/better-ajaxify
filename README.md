better-ajaxify [![Build Status](https://api.travis-ci.org/chemerisuk/better-ajaxify.png?branch=master)](http://travis-ci.org/chemerisuk/better-ajaxify)
==============
> Ajax websites engine for [better-dom](https://github.com/chemerisuk/better-dom)

Demo: http://chemerisuk.github.io/better-ajaxify/

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
    <script src="bower_components/better-ajaxify/src/better-ajaxify.js"></script>
</body>
</html>
```
const parser = new DOMParser();

document.addEventListener("ajaxify:fetch", function(e) {
    console.log("ajaxify:fetch", e);

    const req = e.detail;
    const html = sessionStorage[req.url];
    if (html) {
        e.preventDefault();

        const doc = parser.parseFromString(html, "text/html");
        Object.defineProperty(doc, "URL", {get: () => req.url});

        const event = document.createEvent("CustomEvent");
        event.initCustomEvent("ajaxify:navigate", true, true, doc);
        document.dispatchEvent(event);
    } else {
        document.documentElement.setAttribute("aria-busy", "true");
    }
}, true);

document.addEventListener("ajaxify:load", function(e) {
    console.log("ajaxify:load", e);

    const res = e.detail;
    if (res.ok) {
        res.clone().text().then(html => {
            sessionStorage[res.url] = html;
        });
    }
    document.documentElement.removeAttribute("aria-busy");
}, true);

document.addEventListener("ajaxify:error", function(e) {
    console.log("ajaxify:error", e);

    document.documentElement.removeAttribute("aria-busy");
}, true);

document.addEventListener("ajaxify:navigate", function(e) {
    console.log("ajaxify:navigate", e);
}, true);

//document.documentElement.querySelector("main").setAttribute("data-ajaxify", "off");
//document.documentElement.setAttribute("data-ajaxify", "on");

// document.addEventListener("ajaxify:send", function(e) {
//     console.log("ajaxify:send", e.detail);
// });

// document.addEventListener("ajaxify:swap", function(e) {
//     console.log("ajaxify:swap", e.detail);
// });

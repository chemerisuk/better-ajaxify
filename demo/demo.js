document.addEventListener("ajaxify:fetch", function(e) {
    console.log("ajaxify:fetch", e);

    const req = e.detail;
    const html = sessionStorage[req.url];
    if (!html) {
        document.documentElement.setAttribute("aria-busy", "true");
    } else {
        e.preventDefault();

        const res = new Response(html);
        Object.defineProperty(res, "url", {get: () => req.url});

        const event = document.createEvent("CustomEvent");
        event.initCustomEvent("ajaxify:load", true, true, res);
        document.dispatchEvent(event);
    }
}, true);

document.addEventListener("ajaxify:load", function(e) {
    console.log("ajaxify:load", e);

    document.documentElement.setAttribute("aria-busy", "false");

    const res = e.detail;
    if (res.ok && !res.bodyUsed) {
        res.clone().text().then(html => {
            sessionStorage[res.url] = html;
        });
    }
}, true);

document.addEventListener("ajaxify:error", function(e) {
    console.log("ajaxify:error", e);

    document.documentElement.setAttribute("aria-busy", "false");
}, true);

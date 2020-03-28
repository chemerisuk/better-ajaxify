document.addEventListener("ajaxify:navigate", function(e) {
    const main = document.querySelector("main");
    if (main && e.target === main) return;

    e.preventDefault();

    // only update <main> element content

    const eventCopy = document.createEvent("CustomEvent");
    eventCopy.initCustomEvent(e.type, true, true, e.detail);
    main.dispatchEvent(eventCopy);
}, true);

document.addEventListener("ajaxify:swap", function(e) {
    const source = e.target;
    const dest = e.detail;

    source.setAttribute("aria-hidden", "true");
    dest.setAttribute("aria-hidden", "false");
}, true);

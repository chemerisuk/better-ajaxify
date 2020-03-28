document.addEventListener("ajaxify:navigate", function(e) {
    const main = document.querySelector("main");
    if (main && e.target === main) return;

    e.preventDefault();

    const eventCopy = document.createEvent("CustomEvent");
    eventCopy.initCustomEvent(e.type, true, true, e.detail);
    main.dispatchEvent(eventCopy);
}, true);

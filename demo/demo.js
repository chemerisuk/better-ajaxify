document.addEventListener("ajaxify:fetch", function(e) {
    console.log("ajaxify:fetch", e);

    document.documentElement.setAttribute("aria-busy", "true");
});

document.addEventListener("ajaxify:error", function(e) {
    console.log("ajaxify:error", e);

    document.documentElement.removeAttribute("aria-busy");
});

document.addEventListener("ajaxify:navigate", function(e) {
    console.log("ajaxify:navigate", e);

    document.documentElement.removeAttribute("aria-busy");
});


//document.documentElement.querySelector("main").setAttribute("data-ajaxify", "off");
//document.documentElement.setAttribute("data-ajaxify", "on");

// document.addEventListener("ajaxify:send", function(e) {
//     console.log("ajaxify:send", e.detail);
// });

// document.addEventListener("ajaxify:swap", function(e) {
//     console.log("ajaxify:swap", e.detail);
// });

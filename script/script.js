menu = document.getElementById("menu");
header = document.querySelector("header")
anchors = document.querySelectorAll("header > a");

menu.addEventListener("click", function() {
    header.classList.add("menuOn")
})

window.addEventListener('hashchange', function() {
    header.classList.remove("menuOn")
});

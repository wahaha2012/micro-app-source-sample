document.querySelector("#react-app").innerHTML = "Hello React";

window.globalStr = "child";

window.addEventListener("click", function (e) {
  console.log(e.pageX, e.pageY);
});

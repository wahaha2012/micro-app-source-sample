window.document.querySelector("#app").innerHTML = "Hello React";

window.globalStr = "child";

window.addEventListener("click", function (e) {
  console.log(e.pageX, e.pageY);
});

window.microApp?.addDataListener((data) => {
  console.log("接收到数据", data);
});

setTimeout(() => {
  window.microApp?.dispatch({ name: "来自子应用" });
}, 1000);

document.querySelector("#app").innerHTML = "Hello React";

this.globalStr = "child";

window.addEventListener("click", function (e) {
  console.log(e.pageX, e.pageY);
});

this.microApp?.addDataListener((data) => {
  console.log("接收到数据", data);
});

setTimeout(() => {
  this.microApp?.dispatch({ name: "来自子应用" });
}, 1000);

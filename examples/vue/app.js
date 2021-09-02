import SimpleMicroApp from "../../src/index.js";

SimpleMicroApp.start();

const app = document.querySelector("#app");
const microApp = document.querySelector("#container");
app.innerHTML = "Hello Vue";
app.addEventListener("click", function () {
  microApp.parentElement && microApp.parentElement.removeChild(microApp);
});

setTimeout(() => {
  microApp.setAttribute("data", {
    name: "Data from Base",
  });
}, 1000);

microApp.addEventListener("datachange", (e) => {
  console.log("接收到数据", e.detail.data);
});

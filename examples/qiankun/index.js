import { loadMicroApp } from "qiankun";

const entry = window.location.origin + "/qiankun/app1.html";

// 加载微应用
loadMicroApp({
  name: "reactApp",
  entry,
  container: "#react",
  props: {
    slogan: "Hello Qiankun",
  },
});

const app = document.querySelector("#vue");
const microApp = document.querySelector("#react");
app.innerHTML = "Hello Vue";
app.addEventListener("click", function () {
  microApp.parentElement && microApp.parentElement.removeChild(microApp);
});

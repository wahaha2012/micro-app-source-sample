import SimpleMicroApp from "../../src/index.js";

SimpleMicroApp.start();

const app = document.querySelector("#app");
app.innerHTML = "Hello Vue";
app.addEventListener("click", function () {
  const container = document.querySelector("#container");
  container.parentElement.removeChild(container);
});

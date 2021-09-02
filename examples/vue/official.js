import microApp from "@micro-zoe/micro-app";

const app = document.querySelector("#app");
const microAppContainer = document.querySelector("#container");

app.innerHTML = "Hello Vue";
app.addEventListener("click", function () {
  microAppContainer.parentElement &&
    microAppContainer.parentElement.removeChild(microAppContainer);
});

const microAppUrl = microAppContainer.getAttribute("url");
if (!/^https?:\/\//.test(microAppUrl)) {
  microAppContainer.setAttribute(
    "url",
    `${window.location.origin}${microAppUrl}`
  );
}

microApp.start();

setTimeout(() => {
  microAppContainer.setAttribute("data", {
    name: "Data from Base",
  });
}, 1000);

microAppContainer.addEventListener("datachange", (e) => {
  console.log("接收到数据", e.detail.data);
});

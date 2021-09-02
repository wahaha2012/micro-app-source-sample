(function (global, appName) {
  global[appName] = {
    /**
     * 微应用初始化调用一次
     */
    async bootstrap() {
      console.log("react app bootstraped");

      this.globalStr = "child";

      window.addEventListener("click", function (e) {
        console.log(e.pageX, e.pageY);
      });
    },

    /**
     * 每次进入都会调用mount
     * @param {*} props
     */
    async mount(props) {
      console.log("mount props=>", props);

      document.querySelector("#app").innerHTML = "Hello React";
    },

    /**
     * 每次切出 / 卸载都会调用
     * @param {*} props
     */
    async unmount(props) {
      console.log("unmount props=>", props);
    },

    /**
     * 可选生命周期钩子，仅仅使用loadMicroApp方式时生效
     * @param {*} props
     */
    async update(props) {
      console.log("update props=>", props);
    },
  };
})(window, "reactApp");

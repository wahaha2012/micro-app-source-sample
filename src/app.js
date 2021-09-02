import loadHtml from "./source";
import Sandbox from "./sandbox";

// 创建微应用
export default class CreateApp {
  constructor({ name, url, baseUrl, container }) {
    this.name = name; // 应用名称
    this.url = url; // url地址
    this.baseUrl = baseUrl; // base url
    this.container = container; // micro-app元素
    this.status = "loading";

    this.sandbox = new Sandbox(name);
    loadHtml(this);
  }

  status = "created"; // 组件状态，包括created/loading/mount/unmount

  // 存放应用的静态资源
  source = {
    links: new Map(), // link元素对应的静态资源
    scripts: new Map(), // script元素对应的静态资源
  };

  // 资源加载完时执行
  onLoad(htmlDom) {
    this.loadCount = this.loadCount ? this.loadCount + 1 : 1;
    // 第二次执行且组件未卸载时执行渲染
    if (this.loadCount === 2 && this.status !== "unmount") {
      // 记录DOM结构用于后续操作
      this.source.html = htmlDom;
      // 执行mount方法
      this.mount();
    }
  }

  /**
   * 资源加载完成后进行渲染
   */
  mount() {
    // 克隆DOM节点
    const cloneHtml = this.source.html.cloneNode(true);
    // 创建一个fragment节点作为模板，这样不会产生冗余的元素
    const fragment = document.createDocumentFragment();
    Array.from(cloneHtml.childNodes).forEach((node) => {
      fragment.appendChild(node);
    });

    // 将格式化后的DOM结构插入到容器中
    this.container.appendChild(fragment);

    // 启动沙箱
    this.sandbox.start();

    // 执行js
    this.source.scripts.forEach((info) => {
      const code = this.sandbox.bindScope(info.code);
      (0, eval)(code);
    });

    // 标记应用为已渲染
    this.status = "mounted";
  }

  /**
   * 卸载应用
   * 执行关闭沙箱，清空缓存等操作
   * @param {Boolean} destory 是否完全销毁，删除缓存资源
   */
  unmount(destroy) {
    // 更新状态
    this.status = "unmount";
    // 清空容器
    this.container = null;
    // 停用沙箱
    this.sandbox.stop();
    // destory为true，则删除应用
    if (destroy) {
      appInstanceMap.delete(this.name);
    }
  }
}

export const appInstanceMap = new Map();

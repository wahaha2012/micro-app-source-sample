(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  /**
   * 获取静态资源
   * @param {string} url 静态资源地址
   */
  function fetchSource(url) {
    return fetch(url).then((res) => {
      return res.text();
    });
  }

  function fetchLinksFromHtml(app, microAppHead, htmlDom) {
    const linkEntries = Array.from(app.source.links.entries());
    // 通过fetch请求所有css资源
    const fetchLinkPromise = [];
    for (const [url] of linkEntries) {
      fetchLinkPromise.push(fetchSource(url));
    }

    Promise.all(fetchLinkPromise)
      .then((res) => {
        for (let i = 0; i < res.length; i++) {
          const code = res[i];
          // 拿到css资源后放入style元素并插入到micro-app-head中
          const link2Style = document.createElement("style");
          link2Style.textContent = code;
          microAppHead.appendChild(link2Style);

          // 将代码放入缓存，再次渲染时可以从缓存中获取
          linkEntries[i][1].code = code;
        }

        // 处理完成后执行onLoad方法
        app.onLoad(htmlDom);
      })
      .catch((e) => {
        console.error("加载css出错", e);
      });
  }

  /**
   * 获取远程JS资源
   * @param {*} app 应用实例
   * @param {*} htmlDom DOM
   */
  function fetchScriptsFromHtml(app, htmlDom) {
    const scriptEntries = Array.from(app.source.scripts.entries());
    // 通过fetch请求所有JS资源
    const fetchScriptPromise = [];
    for (const [url, info] of scriptEntries) {
      // 如果是内联script，则不需要请求资源
      fetchScriptPromise.push(
        info.code ? Promise.resolve(info.code) : fetchSource(url)
      );
    }

    Promise.all(fetchScriptPromise)
      .then((res) => {
        for (let i = 0; i < res.length; i++) {
          const code = res[i];
          // 将代码放入缓存，再次渲染时可以从缓存获取
          scriptEntries[i][1].code = code;
        }

        // 处理完成后执行onLoad方法
        app.onLoad(htmlDom);
      })
      .catch((e) => {
        console.error("加载js出错", e);
      });
  }

  /**
   * 递归处理每一个元素，存入到app实例source map表中
   * @param {*} parent 父元素
   * @param {*} app 应用实例
   */
  function extractSourceDom(parent, app) {
    const children = Array.from(parent.children);

    // 递归每一个子元素
    children.length &&
      children.forEach((child) => {
        extractSourceDom(child, app);
      });

    for (const dom of children) {
      if (dom instanceof HTMLLinkElement) {
        // 提取css地址
        const href = dom.getAttribute("href");
        if (dom.getAttribute("rel") === "stylesheet" && href) {
          // 计入source缓存中
          app.source.links.set(href, {
            code: "", // 代码内容
          });
        }

        // 删除原有元素
        parent.removeChild(dom);
      } else if (dom instanceof HTMLScriptElement) {
        // 提取JS地址
        const src = dom.getAttribute("src");
        // 远程script
        if (src) {
          app.source.scripts.set(src, {
            code: "", // 代码内容
            isExternal: true, // 是否远程script
          });
          // 内联script
        } else if (dom.textContent) {
          const nonceStr = Math.random().toString(36).substr(2, 15);
          app.source.scripts.set(nonceStr, {
            code: dom.textContent, // 代码内容
            isExternal: false, // 是否远程script
          });

          parent.removeChild(dom);
        } else ;
      }
    }
  }

  function loadHtml(app) {
    fetchSource(app.url)
      .then((html) => {
        html = html
          .replace(/<head[^>]*>[\s\S]*?<\/head>/i, (match) => {
            // 将head标签替换为micro-app-head，因为web页面只允许有一个head标签
            return match
              .replace(/<head/i, "<micro-app-head")
              .replace(/<\/head>/i, "</micro-app-head>");
          })
          .replace(/<body[^>]*>[\s\S]*?<\/body>/i, (match) => {
            // 将body标签替换为micro-app-body，防止与基座应用的body标签重复导致问题
            return match
              .replace(/<body/i, "<micro-app-body")
              .replace(/<\/body>/i, "</micro-app-body>");
          });

        // 将html字符串转换为DOM结构
        const htmlDom = document.createElement("div");
        htmlDom.innerHTML = html;
        console.log("html:", htmlDom);

        // 进一步提取和处理js、css等静态资源
        extractSourceDom(htmlDom, app);

        // 获取micro-app-head元素
        const microAppHead = htmlDom.querySelector("micro-app-head");
        // 如果有远程css资源，则通过fetch请求获取内容
        if (app.source.links.size) {
          fetchLinksFromHtml(app, microAppHead, htmlDom);
        } else {
          app.onLoad(htmlDom);
        }

        // 如果有远程js资源，则通过fetch请求获取内容
        if (app.source.scripts.size) {
          fetchScriptsFromHtml(app, htmlDom);
        } else {
          app.onLoad(htmlDom);
        }
      })
      .catch((e) => {
        console.error("加载html出错", e);
      });
  }

  // 创建微应用
  class CreateApp {
    constructor({ name, url, container }) {
      this.name = name; // 应用名称
      this.url = url; // url地址
      this.container = container; // micro-app元素
      this.status = "loading";
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

      // 执行js
      this.source.scripts.forEach((info) => {
        (0, eval)(info.code);
      });

      // 标记应用为已渲染
      this.status = "mounted";
    }

    /**
     * 卸载应用
     * 执行关闭沙箱，清空缓存等操作
     */
    unmount() {}
  }

  const appInstanceMap = new Map();

  // 自定义元素
  class MyElement extends HTMLElement {
    // 声明需要监听的属性名，只有这些属性变化时才会触发attributeChangedCallback
    static get observedAttributes() {
      return ["name", "url"];
    }

    constructor() {
      super();
    }

    connectedCallback() {
      // 元素被插入到DOM时执行，此时去加载子应用的静态资源并渲染
      console.log("micro-app is connected");

      // 创建微应用实例
      const app = new CreateApp({
        name: this.name,
        url: this.url,
        container: this,
      });

      // 记入缓存，用于后续功能
      appInstanceMap.set(this.name, app);
    }

    disconnectedCallback() {
      // 元素从DOM中删除时执行，此时进行一些卸载操作
      console.log("micro-app has disconnected");
    }

    attributeChangedCallback(attrName, oldVal, newVal) {
      // 元素属性发生变化时执行，可以获取name、url等属性的值
      console.log(`attribute ${attrName}: ${oldVal} => ${newVal}`);

      // 分别记录name及url的值
      if (attrName === "name" && !this.name && newVal) {
        this.name = newVal;
      } else if (attrName === "url" && !this.url && newVal) {
        this.url = newVal;
      }
    }
  }

  /**
   * 注册元素
   * 注册后，就可以像普通元素一样使用micro-app，当micro-app元素被插入或删除DOM时即可触发相应的生命周期函数。
   */
  function defineElement() {
    // 如果已经定义过，则忽略
    if (!window.customElements.get("micro-app")) {
      window.customElements.define("micro-app", MyElement);
    }
  }

  const SimpleMicroApp = {
    start() {
      defineElement();
    },
  };

  document.querySelector("#app").innerHTML = "Hello Vue";

  SimpleMicroApp.start();

})));

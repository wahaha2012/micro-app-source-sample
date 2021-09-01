(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  /*global fetch*/

  /**
   * 获取静态资源
   * @param {string} url 静态资源地址
   */
  function fetchSource(url) {
    return fetch(url).then((res) => {
      return res.text();
    });
  }

  /**
   * 修改CSS规则，添加前缀
   * @param {*} rule css规则
   * @param {*} prefix 前缀
   * @returns {String}
   */
  function scopedStyleRule(rule, prefix) {
    // 获取CSS规则对象的选择和内容
    const { selectorText, cssText } = rule;

    // 处理顶层选择器，如body，html都转换为micro-app[name=xxx]
    if (/^((html[\s>~,]+body)|(html|body|:root))$/.test(selectorText)) {
      return cssText.replace(/^((html[\s>~,]+body)|(html|body|:root))/, prefix);
    } else if (selectorText === "*") {
      // 选择器 * 替换为 micro-app[name=xxx] *
      return cssText.replace("*", `${prefix} *`);
    }

    const builtInRootSelectorRE =
      /(^|\s+)((html[\s>~]+body)|(html|body|:root))(?=[\s>~]+|$)/;

    // 匹配查询选择器
    return cssText.replace(/^[\s\S]+{/, (selectors) => {
      return selectors.replace(/(^|,)([^,]+)/g, (all, $1, $2) => {
        // 如果含有顶层选择器，需要单独处理
        if (builtInRootSelectorRE.test($2)) {
          // body[name=xx]|body.xx|body#xx 等都不需要转换
          return all.replace(builtInRootSelectorRE, prefix);
        }
        // 在选择器前加上前缀
        return `${$1} ${prefix} ${$2.replace(/^\s*/, "")}`;
      });
    });
  }

  /**
   * 处理media和supports规则
   * @param {*} rule cssRules
   * @param {String} prefix 前缀
   * @param {String} packName Query类别
   * @returns
   */
  function scopedPackRule(rule, prefix, packName) {
    // 递归执行scopedRule，处理 media 和 supports 内部规则
    const result = scopedRule(Array.from(rule.cssRules), prefix);
    return `@${packName} ${rule.conditionText} {${result}}`;
  }

  /**
   * 依次处理每个cssRule
   * @param {*} rules cssRule
   * @param {String} prefix 前缀
   * @returns
   */
  function scopedRule(rules, prefix) {
    let result = "";
    // 遍历rules，处理每一条规则
    for (const rule of rules) {
      switch (rule.type) {
        case 1: // STYLE_RULE
          result += scopedStyleRule(rule, prefix);
          break;
        case 4: // MEDIA_RULE
          result += scopedPackRule(rule, prefix, "media");
          break;
        case 12: // SUPPORTS_RULE
          result += scopedPackRule(rule, prefix, "supports");
          break;
        default:
          result += rule.cssText;
          break;
      }
    }

    return result;
  }

  let templateStyle; // 模板style

  /**
   * 进行样式隔离
   * @param {HTMLStyleElement} styleElement style元素
   * @param {String} appName 应用名称
   */
  function scopedCSS(styleElement, appName) {
    // 前缀
    const prefix = `micro-app[name=${appName}]`;

    // 初始化时创建模板标签
    if (!templateStyle) {
      templateStyle = document.createElement("style");
      document.body.appendChild(templateStyle);
      // 设置样式表无效，防止对应用造成影响
      templateStyle.sheet.disabled = true;
    }

    if (styleElement.textContent) {
      // 将元素的内容赋值给模板元素
      templateStyle.textContent = styleElement.textContent;
      // 格式化规则，并将格式化后的规则赋值给style元素
      styleElement.textContent = scopedRule(
        Array.from(templateStyle.sheet?.cssRules ?? []),
        prefix
      );
      // 清空模板style内容
      templateStyle.textContent = "";
    } else {
      // 监听动态添加内容的style元素
      const observer = new MutationObserver(function () {
        // 断开监听
        observer.disconnect();
        // 格式化规则，并将格式化后的规则赋值给style元素
        styleElement.textContent = scopedRule(
          Array.from(styleElement.sheet?.cssRules ?? []),
          prefix
        );
      });

      // 监听style元素的内容是否变化
      observer.observe(styleElement, { childList: true });
    }
  }

  /*global HTMLLinkElement, HTMLScriptElement, HTMLStyleElement*/

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
          scopedCSS(link2Style, app.name);
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
        }
      } else if (dom instanceof HTMLStyleElement) {
        // 进行样式隔离
        scopedCSS(dom, app.name);
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

  /**
   * 格式化事件名称，保证基座应用和子应用的绑定通信
   * @param {*} appName 应用名称
   * @param {*} fromBaseApp 是否从基座应用发送数据
   * @returns
   */
  function formatEventName(appName, fromBaseApp) {
    if (typeof appName !== "string" || !appName) {
      return "";
    }
    return fromBaseApp
      ? `__from_base_app_${appName}__`
      : `__from_micro_app_${appName}__`;
  }

  // 发布订阅系统
  class EventCenter {
    // 缓存数据和绑定函数
    eventList = new Map();

    /**
     * 绑定监听函数
     * @param {*} name 事件名称
     * @param {*} f 处理函数
     */
    on(name, f) {
      let eventInfo = this.eventList.get(name);
      // 如果没有缓存，则初始化
      if (!eventInfo) {
        eventInfo = {
          data: {},
          callbacks: new Set(),
        };
        // 放入缓存
        this.eventList.set(name, eventInfo);
      }

      // 记录绑定函数
      eventInfo.callbacks.add(f);
    }

    /**
     * 解除绑定
     * @param {*} name
     * @param {*} f
     */
    off(name, f) {
      const eventInfo = this.eventList.get(name);
      // eventInfo存在且f为函数则卸载指定函数
      if (eventInfo && typeof f === "function") {
        eventInfo.callbacks.delete(f);
      }
    }

    // 发送数据
    dispatch(name, data) {
      const eventInfo = this.eventList.get(name);
      // 当数据不相等时才更新
      if (eventInfo && eventInfo.data !== data) {
        eventInfo.data = data;
        // 遍历执行所有绑定函数
        for (const f of eventInfo.callbacks) {
          f(data);
        }
      }
    }
  }

  // 创建发布订阅对象
  const eventCenter = new EventCenter();

  // 基座应用的数据通信方法集合
  class EventCenterForBaseApp {
    /**
     * 向指定子应用发送数据
     * @param {*} appName 子应用名称
     * @param {*} data 对象数据
     */
    setData(appName, data) {
      eventCenter.dispatch(formatEventName(appName, true), data);
    }

    /**
     * 清空某个应用的监听函数
     * @param {*} appName 子应用名称
     */
    clearDataListener(appName) {
      eventCenter.off(formatEventName(appName, false));
    }
  }

  // 子应用的数据通信方法集合
  class EventCenterForMicroApp {
    constructor(appName) {
      this.appName = appName;
    }

    /**
     * 监听基座应用发送的数据
     * @param {*} cb 绑定函数
     */
    addDataListener(cb) {
      eventCenter.on(formatEventName(this.appName, true), cb);
    }

    /**
     * 解除监听函数
     * @param {*} cb 绑定函数
     */
    removeDataListener(cb) {
      if (typeof cb === "function") {
        eventCenter.off(formatEventName(this.appName, true), cb);
      }
    }

    dispatch(data) {
      const app = appInstanceMap.get(this.appName);
      if (app?.container) {
        // 子应用以自定义事件的形式发送数据
        const event = new CustomEvent("datachange", {
          detail: {
            data,
          },
        });

        app.container.dispatchEvent(event);
      }
    }

    /**
     * 清空当前子应用绑定的所有监听函数
     */
    clearDataListener() {
      eventCenter.off(formatEventName(this.appName, true));
    }
  }

  // 记录addEventListener、removeEventListener原生方法
  const rawWindowAddEventListener = window.addEventListener;
  const rawWindowRemoveEventListener = window.removeEventListener;

  /**
   * 重写全局事件的监听和解绑
   * @param {*} microWindow 原型对象
   */
  function effect(microWindow) {
    // 使用Map记录全局事件
    const eventListenerMap = new Map();

    // 重写addEventListener
    microWindow.addEventListener = function (type, listener, options) {
      const listenerList = eventListenerMap.get(type);
      // 当前事件非第一次监听，则添加缓存
      if (listenerList) {
        listenerList.add(listener);
      } else {
        // 当前事件第一次监听，则初始化数据
        eventListenerMap.set(type, new Set([listener]));
      }
      // 执行原生监听函数
      return rawWindowAddEventListener.call(window, type, listener, options);
    };

    // 重写removeEventListener
    microWindow.removeEventListener = function (type, listener, options) {
      const listenerList = eventListenerMap.get(type);
      // 从缓存中删除监听函数
      if (listenerList?.size && listenerList.has(listener)) {
        listenerList.delete(listener);
      }
      // 执行原生解绑函数
      return rawWindowRemoveEventListener.call(window, type, listener, options);
    };

    // 清空残余事件
    return () => {
      console.log("需要卸载的全局事件", eventListenerMap);
      // 清空window绑定事件
      if (eventListenerMap.size) {
        // 将残余的没有解绑的函数依次解绑
        eventListenerMap.forEach((listenerList, type) => {
          if (listenerList.size) {
            for (const listener of listenerList) {
              rawWindowRemoveEventListener.call(window, type, listener);
            }
          }
        });
        eventListenerMap.clear();
      }
    };
  }

  const rawDocument = new Function("return document")();
  const rawWindow = new Function("return window")();

  /**
   * currentAppName
   */
  let currentMicroAppName = null;
  function setCurrentAppName(appName) {
    currentMicroAppName = appName;
  }

  function getCurrentAppName() {
    return currentMicroAppName;
  }

  /**
   * 延迟任务
   * @param {*} fn 回调函数
   * @param  {...any} args 入参
   */
  function defer(fn, ...args) {
    Promise.resolve().then(fn.bind(null, ...args));
  }

  class SandBox {
    active = false; // 沙箱是否在运行
    microWindow = {}; // 代理的对象
    injectedKeys = new Set(); // 新添加的属性，在卸载时清空

    constructor(appName) {
      // 创建数据通信对象
      this.microWindow.microApp = new EventCenterForMicroApp(appName);
      // 卸载钩子
      this.releaseEffect = effect(this.microWindow);

      this.proxyWindow = new Proxy(this.microWindow, {
        // 取值
        get(target, key) {
          // 顶层对象
          if (["window", "self", "globalThis"].includes(key)) {
            return this.proxyWindow;
          }

          if (key === "top" || key === "parent") {
            // 无嵌套iframe
            if (rawWindow === rawWindow.parent) {
              return this.proxyWindow;
            } else {
              // iframe中
              return Reflect.get(rawWindow, key);
            }
          }

          if (key === "hasOwnProperty") {
            return hasOwnProperty;
          }

          if (key === "document" || key === "eval") {
            // 临时设置共享独享currentMicroAppName
            setCurrentAppName(appName);
            // 同步执行栈结束，借助EventLoop，重置currentMicroAppName
            defer(() => setCurrentAppName(null));
            switch (key) {
              case "document":
                return rawDocument;
              case "eval":
                return eval;
            }
          }

          // 优先从代理对象上取值
          if (Reflect.has(target, key)) {
            return Reflect.get(target, key);
          }

          // 否则兜底到window对象上取值
          const rawValue = Reflect.get(rawWindow, key);

          // 如果兜底的值为函数，则需要绑定window对象，如：console、alert等
          if (typeof rawValue === "function") {
            const valueStr = rawValue.toString();
            // 排除构造函数
            if (
              !/^function\s+[A-Z]/.test(valueStr) &&
              !/^class\s+/.test(valueStr)
            ) {
              return rawValue.bind(window);
            }
          }

          // 其它情况直接返回
          return rawValue;
        },

        // 赋值
        set(target, key, value) {
          // 沙箱只有在运行时可以设置变量
          if (this.active) {
            Reflect.set(target, key, value);

            // 记录添加的变量，用于后续清空操作
            this.injectedKeys.add(key);
          }

          return true;
        },

        deleteProperty(target, key) {
          // 当前key存在于代理对象上时才满足删除条件
          if (target.hasOwnProperty(key)) {
            return Reflect.deleteProperty(target, key);
          }
          return true;
        },
      });
    }

    // 启动
    start() {
      if (!this.active) {
        this.active = true;
      }
    }

    // 停止
    stop() {
      if (this.active) {
        this.active = false;

        // 清空变量
        this.injectedKeys.forEach((key) => {
          Reflect.deleteProperty(this.microWindow, key);
        });
        this.injectedKeys.clear();

        // 卸载全局事件
        this.releaseEffect();
      }

      // 清空所有绑定函数
      this.microWindow.microApp.clearDataListener();
    }

    // 修改js作用域
    bindScope(code) {
      window.proxyWindow = this.proxyWindow;
      return `;(function(window, self){with(window){;${code}\n}}).call(window.proxyWindow, window.proxyWindow, window.proxyWindow);`;
    }
  }

  // 创建微应用
  class CreateApp {
    constructor({ name, url, container }) {
      this.name = name; // 应用名称
      this.url = url; // url地址
      this.container = container; // micro-app元素
      this.status = "loading";

      this.sandbox = new SandBox(name);
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
        (0, eval)(this.sandbox.bindScope(info.code));
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

  const appInstanceMap = new Map();

  /*global Document*/

  const BaseAppData = new EventCenterForBaseApp();

  const rawQuerySelector = Document.prototype.querySelector;

  function patchElementPrototype() {
    // 记录原生方法
    const rawSetAttribute = Element.prototype.setAttribute;

    // 重写setAttribute
    Element.prototype.setAttribute = function setAttribute(key, value) {
      // 目标为micro-app标签且属性名称为data时进行处理
      if (/^micro-app/i.test(this.tagName) && key === "data") {
        if (toString.call(value) === "[object Object]") {
          // 克隆一个新的对象
          const cloneValue = {};
          Object.getOwnPropertyNames(value).forEach((propertyKey) => {
            // 过滤vue框架注入的数据
            if (
              !(
                typeof propertyKey === "string" && propertyKey.indexOf("__") === 0
              )
            ) {
              cloneValue[propertyKey] = value[propertyKey];
            }
          });
          // 发送数据
          BaseAppData.setData(this.getAttribute("name"), cloneValue);
        }
      } else {
        rawSetAttribute.call(this, key, value);
      }
    };
  }

  function patchDocument() {
    // QuerySelector
    function querySelector(selectors) {
      const appName = getCurrentAppName();
      if (!appName || selectors === "head" || selectors === "body") {
        return rawQuerySelector.call(rawDocument, selectors);
      }
      return (
        appInstanceMap.get(appName)?.container.querySelector(selectors) ?? null
      );
    }

    Document.prototype.querySelector = querySelector;
  }

  patchElementPrototype();

  // 自定义元素
  class MyElement extends HTMLElement {
    // 记录微应用个数
    static microAppCount = 0;

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

      // 自定义元素只执行一次的内容
      if (++MyElement.microAppCount === 1) {
        patchDocument();
      }

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
      // 获取应用实例
      const app = appInstanceMap.get(this.name);
      // 如果有属性destroy，则完全卸载应用包括缓存的文件
      app.unmount(this.hasAttribute("destory"));
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

  patchElementPrototype();
  const SimpleMicroApp = {
    start() {
      defineElement();
    },
  };

  SimpleMicroApp.start();

  const app = document.querySelector("#app");
  const microApp = document.querySelector("#container");
  app.innerHTML = "Hello Vue";
  app.addEventListener("click", function () {
    microApp.parentElement.removeChild(microApp);
  });

  setTimeout(() => {
    microApp.setAttribute("data", {
      name: "Data from Base",
    });
  }, 1000);

  microApp.addEventListener("datachange", (e) => {
    console.log("接收到数据", e.detail.data);
  });

})));

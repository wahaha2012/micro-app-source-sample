/*global HTMLLinkElement, HTMLScriptElement, HTMLStyleElement*/
import scopedCSS from "../scopedcss";
import { fetchSource } from "./network";

export function fetchLinksFromHtml(app, microAppHead, htmlDom) {
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
export function fetchScriptsFromHtml(app, htmlDom) {
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
 * 构建完整URL路径
 * @param {*} url source url
 * @param {*} baseUrl base url
 * @returns
 */
export function makeUrl(url, baseUrl) {
  if (!/^http|^\//i.test(url)) {
    return baseUrl + url;
  } else {
    return url;
  }
}

/**
 * 递归处理每一个元素，存入到app实例source map表中
 * @param {*} parent 父元素
 * @param {*} app 应用实例
 */
export function extractSourceDom(parent, app) {
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
        app.source.links.set(makeUrl(href, app.baseUrl), {
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
        app.source.scripts.set(makeUrl(src, app.baseUrl), {
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

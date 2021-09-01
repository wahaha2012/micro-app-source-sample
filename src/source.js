import { fetchSource } from "./utils/network";
import {
  extractSourceDom,
  fetchLinksFromHtml,
  fetchScriptsFromHtml,
} from "./utils/source";

export default function loadHtml(app) {
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

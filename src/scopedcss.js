import { scopedRule } from "./utils/css";

let templateStyle; // 模板style

/**
 * 进行样式隔离
 * @param {HTMLStyleElement} styleElement style元素
 * @param {String} appName 应用名称
 */
export default function scopedCSS(styleElement, appName) {
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

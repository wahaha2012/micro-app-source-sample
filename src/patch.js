/*global Document*/

import { appInstanceMap } from "./app";
import { EventCenterForBaseApp } from "./data";
import { rawDocument, getCurrentAppName } from "./utils/global";

const BaseAppData = new EventCenterForBaseApp();

const rawQuerySelector = Document.prototype.querySelector;
const rawQuerySelectorAll = Document.prototype.querySelectorAll;

export function patchElementPrototype() {
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

export function patchDocument() {
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

export function releaseDocumentPatch() {
  Document.prototype.querySelector = rawQuerySelector;
}

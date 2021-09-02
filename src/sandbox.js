import { EventCenterForMicroApp } from "./data";
import { effect } from "./utils/sandbox";
import {
  rawWindow,
  setCurrentAppName,
  defer,
  rawDocument,
  unscopables,
  escapeSetterKeyList,
} from "./utils/global";

export default class SandBox {
  active = false; // 沙箱是否在运行
  microWindow = {}; // 代理的对象
  injectedKeys = new Set(); // 新添加的属性，在卸载时清空

  constructor(appName) {
    const hasOwnProperty = (key) =>
      this.microWindow.hasOwnProperty(key) || rawWindow.hasOwnProperty(key);
    // 创建数据通信对象
    this.microWindow.microApp = new EventCenterForMicroApp(appName);
    // 卸载钩子
    this.releaseEffect = effect(this.microWindow);

    this.proxyWindow = new Proxy(this.microWindow, {
      // 取值
      get: (target, key) => {
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
      set: (target, key, value) => {
        // 沙箱只有在运行时可以设置变量
        if (this.active) {
          if (escapeSetterKeyList.includes(key)) {
            Reflect.set(rawWindow, key, value);
          } else {
            Reflect.set(target, key, value);

            // 记录添加的变量，用于后续清空操作
            this.injectedKeys.add(key);
          }
        }

        return true;
      },

      // 重写has方法，使直接访问window属性或方法通过代理方式
      has: (target, key) => {
        return key in unscopables || key in target || key in rawWindow;
      },

      deleteProperty: (target, key) => {
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
    rawWindow.proxyWindow = this.proxyWindow;
    return `;(function(window, self){with(window){;${code}\n}}).call(window.proxyWindow, window.proxyWindow, window.proxyWindow);`;
  }
}

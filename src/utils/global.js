export const rawDocument = new Function("return document")();
export const rawWindow = new Function("return window")();

/**
 * currentAppName
 */
let currentMicroAppName = null;
export function setCurrentAppName(appName) {
  currentMicroAppName = appName;
}

export function getCurrentAppName() {
  return currentMicroAppName;
}

/**
 * 延迟任务
 * @param {*} fn 回调函数
 * @param  {...any} args 入参
 */
export function defer(fn, ...args) {
  Promise.resolve().then(fn.bind(null, ...args));
}

/**
 * 沙箱配置
 */
// 不能设置为局部作用域的属性
export const unscopables = {
  undefined: true,
  Array: true,
  Object: true,
  String: true,
  Boolean: true,
  Math: true,
  Number: true,
  Symbol: true,
  parseFloat: true,
  Float32Array: true,
};

// 一些只能赋值到原window上的变量
export const escapeSetterKeyList = ["location"];

// 可以逃逸到外层window的变量
const staticEscapeProperties = [
  "System",
  "__cjsWrapper",
  "__REACT_ERROR_OVERLAY_GLOBAL_HOOK__",
];

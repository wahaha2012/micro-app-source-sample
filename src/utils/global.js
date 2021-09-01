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

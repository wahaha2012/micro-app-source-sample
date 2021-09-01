// 记录addEventListener、removeEventListener原生方法
const rawWindowAddEventListener = window.addEventListener;
const rawWindowRemoveEventListener = window.removeEventListener;

/**
 * 重写全局事件的监听和解绑
 * @param {*} microWindow 原型对象
 */
export function effect(microWindow) {
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

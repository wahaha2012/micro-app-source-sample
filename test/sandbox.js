// sandbox.js
function sandboxJS(js) {
  var inject = { bar: 40 };
  var handlers = {
    has(target, key, context) {
      console.log("has() - %s", key);
      return (
        Object.keys(inject).includes(key) || Reflect.has(target, key, context)
      );
    },
    get(target, key, context) {
      console.log("get() - %s", key);
      if (Object.keys(inject).includes(key)) return inject[key];
      return Reflect.get(target, key, context);
    },
  };
  var proxy = new Proxy(global, handlers);
  var proxyName = `proxy${Math.floor(Math.random() * 1e9)}`;
  var fn = new Function(proxyName, `with(${proxyName}){${js}}`);
  return fn.call(this, proxy);
}

sandboxJS(`console.log("bar = %s", bar)`);

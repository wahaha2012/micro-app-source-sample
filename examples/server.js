var liveServer = require("@compodoc/live-server");

var params = {
  root: "./examples", // Set root directory that's being served. Defaults to cwd.
  ignore: "server.js", // comma-separated string for paths to ignore
  wait: 1000, // Waits for all changes, before reloading. Defaults to 0 sec.
  logLevel: 2, // 0 = errors only, 1 = some, 2 = lots
};
liveServer.start(params);

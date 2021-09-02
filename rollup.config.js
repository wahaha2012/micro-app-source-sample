import { nodeResolve } from "@rollup/plugin-node-resolve";

export default [
  {
    input: "./examples/vue/app.js",
    output: {
      file: "./examples/dist/app.js",
      format: "umd",
    },
  },
  {
    input: "./examples/vue/app2.js",
    output: {
      file: "./examples/dist/app2.js",
      format: "umd",
    },
    // external: ["@micro-zoe/micro-app"],
    plugins: [nodeResolve()],
  },
];

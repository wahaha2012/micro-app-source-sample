import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";

export default [
  {
    input: "./examples/vue/app.js",
    output: {
      file: "./examples/dist/app.js",
      format: "umd",
    },
  },

  {
    input: "./examples/vue/official.js",
    output: {
      file: "./examples/dist/official.js",
      format: "umd",
    },
    // external: ["@micro-zoe/micro-app"],
    plugins: [nodeResolve()],
  },

  {
    input: "./examples/qiankun/index.js",
    output: {
      file: "./examples/dist/qiankun.js",
      format: "umd",
    },
    plugins: [
      replace({
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      }),
      nodeResolve(),
      commonjs(),
    ],
  },
];

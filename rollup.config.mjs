import { getBabelOutputPlugin } from "@rollup/plugin-babel";
import { minify } from "rollup-plugin-swc-minify";
import * as path from "path";

const
format   = "es",
external = [path.resolve("base-element.js")],
plugins  = [
  getBabelOutputPlugin({
    comments: false,
    assumptions: {"noDocumentAll":true},
    plugins: [
      ["babel-plugin-private-to-public", {"minify":true, "aToZ":true}],
      "@babel/plugin-transform-nullish-coalescing-operator",
      "@babel/plugin-transform-optional-chaining"
    ]
  }),
  minify({format})
],
files = [
  "multi-check",
  "state-btn",
  "input-num",
  "elements",
  "apps/multi-state/index",
  "apps/input-num/index"
];
//==================================
// Map files to an array of objects
export default files.map(name => {
  return {
    input: `${name}.js`,
    output: {
      file: `dist/${name}.js`,
      format
    },
    plugins, external
  };
});
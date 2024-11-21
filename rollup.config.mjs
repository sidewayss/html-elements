import { getBabelOutputPlugin } from "@rollup/plugin-babel";
import swc from "@rollup/plugin-swc";
import * as path from "path";

const
format  = "es",
ext     = [path.resolve("base-element.js")],
plugins = [
  getBabelOutputPlugin({
    comments: false,
    assumptions: {"noDocumentAll":true},
    plugins: [
      ["babel-plugin-private-to-public", {"minify":true, "aToZ":true}],
      "@babel/plugin-transform-nullish-coalescing-operator",
      "@babel/plugin-transform-optional-chaining"
    ]
  })
],
files = [
  ["base-element",],
  ["multi-check", ext],
  ["state-btn",   ext],
  ["input-num",   ext],
  ["elements",],
  ["apps/common",],
  ["apps/multi-state/index",],
  ["apps/input-num/index",]
];
//==================================
// Map files to an array of objects
export default files.map(([name, external]) => {
  return {
    input: `${name}.js`,
    output: {
      file: `dist/${name}.js`,
      format
    },
    plugins, external
  };
});
import { getBabelOutputPlugin } from "@rollup/plugin-babel";
//import terser from "@rollup/plugin-terser";
import * as path from "path";

const
TMP  = "tmp",
DIST = "dist",
format  = "es",
ext     = [path.resolve("base-element.js")],
plugins = [
  getBabelOutputPlugin({
    comments: false,
    assumptions: {"noDocumentAll":true},
    plugins: [
      ["babel-plugin-private-to-public", {"prefix":"ø"}],    // &#xF8
      "@babel/plugin-transform-nullish-coalescing-operator",
      "@babel/plugin-transform-optional-chaining"
    ]
  })/*,
  terser({
    compress: {
      keep_classnames:true,
      keep_infinity:true,
      module:true
    },
    mangle: {
      keep_classnames:true,
      module:true,
      toplevel:true,
      properties: {
        regex: /^ø/
      }
    }
  })*/
],
files = [
  ["base-element", TMP,],
  ["multi-check",  TMP, ext],
  ["state-btn",    TMP, ext],
  ["input-num",    TMP, ext],
  ["elements",     TMP,],
  ["apps/common",  DIST,],
  ["apps/multi-state/index", DIST,],
  ["apps/input-num/index",   DIST, ext]
];
//==============================================
// Map files to an array of objects
export default files.map(([name, dir, external]) => {
  return {
    input: `${name}.js`,
    output: {
      file: `${dir}/${name}.js`,
      format
    },
    plugins, external
  };
});
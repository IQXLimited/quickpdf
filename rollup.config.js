import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "@rollup/plugin-typescript"
import json from "@rollup/plugin-json"
import nodeExternals from "rollup-plugin-node-externals"

export default {
  input: "src/index.ts",
  output: [
    {
      dir: "dist",
      format: "cjs",
      entryFileNames: "[name].cjs",
      chunkFileNames: "[name]-[hash].cjs",
      exports: "auto",
      sourcemap: true
    },
    {
      dir: "dist",
      entryFileNames: "[name].mjs",
      chunkFileNames: "[name]-[hash].mjs",
      format: "esm",
      sourcemap: true
    }
  ],
  plugins: [
    resolve ( {
      preferBuiltins: true,
      browser: true
    } ),
    json ( ),
    commonjs ( {
      transformMixedEsModules: true
    } ),
    nodeExternals ( ),
    typescript ( {
      rootDir: "src",
      baseUrl: "./",
      declaration: true,
      declarationDir: "dist/types",
    } )
  ],
  context: "globalThis"
}

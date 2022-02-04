import svelte from 'rollup-plugin-svelte';
import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import autoPreprocess from 'svelte-preprocess';
import ignore from 'rollup-plugin-ignore';
import json from '@rollup/plugin-json';
import {env} from 'process';
import {terser} from "rollup-plugin-terser";

const plugins = [
  ignore(["path", "url"], { commonjsBugFix: true }),
  commonjs({
    include: ['node_modules/**', '../cytoscape.js-cxtmenu/**'],
  }),
  json(),
  svelte({
    emitCss: false,
    preprocess: autoPreprocess(),
  }),
  typescript({sourceMap: false}),
  nodeResolve({browser: true,
    dedupe: ['svelte']})]

const DEV = env.npm_lifecycle_event === "dev";

if (!DEV) {
  plugins.push(terser());
}

plugins.push(copy({
  targets: [
    {src: 'main.js', dest: 'docs/.obsidian/plugins/juggl'},
    {src: 'styles.css', dest: 'docs/.obsidian/plugins/juggl'},
  ],
  hook: 'writeBundle',
}));

export default {
  input: 'src/main.ts',
  output: {
    dir: '.',
    sourcemap: DEV ? 'inline' : false,
    format: 'cjs',
    exports: 'default',
    // banner: '/* This file is bundled with rollup. For the source code, see Github */',
  },
  external: ['obsidian'],
  plugins: plugins,
};

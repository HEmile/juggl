import svelte from 'rollup-plugin-svelte';
import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';
import autoPreprocess from 'svelte-preprocess';


export default {
  input: 'main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default',
    // banner: '/* This file is bundled with rollup. For the source code, see Github */',
  },
  external: ['obsidian'],
  plugins: [
    commonjs({
      include: ['node_modules/**', '../../cytoscape.js-cxtmenu/**'],
    }),
    svelte({
      emitCss: false,
      preprocess: autoPreprocess(),
    }),
    typescript({sourceMap: true}),
    nodeResolve({browser: true,
      dedupe: ['svelte']}),
    copy({
      targets: [
        {src: 'main.js', dest: '../docs/.obsidian/plugins/juggl'},
        {src: 'styles.css', dest: '../docs/.obsidian/plugins/juggl'},
      ],
      hook: 'writeBundle',
    }),
  ],
};

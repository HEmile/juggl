import typescript from '@rollup/plugin-typescript';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default {
  input: 'main.ts',
  output: {
    dir: '.',
    sourcemap: 'inline',
    format: 'cjs',
    exports: 'default',
  },
  external: ['obsidian'],
  plugins: [

    typescript(),
    nodeResolve({browser: true}),
    commonjs({
      include: 'node_modules/**',
    }),
    copy({
      targets: [
        {src: 'main.js', dest: '../../semantic-obsidian/Semantic Obsidian/.obsidian/plugins/neo4j-graph-view'},
        {src: 'styles.css', dest: '../../semantic-obsidian/Semantic Obsidian/.obsidian/plugins/neo4j-graph-view'},
      ],
      hook: 'writeBundle',
    }),
  ],
};

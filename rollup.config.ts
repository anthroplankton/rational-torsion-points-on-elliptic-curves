import { spawn } from 'node:child_process'
import path from 'node:path'

import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import virtual from '@rollup/plugin-virtual'
import { globSync } from 'glob'
import sveltePreprocess from 'svelte-preprocess'
import css from 'rollup-plugin-css-only'
import livereload from 'rollup-plugin-livereload'
import svelte from 'rollup-plugin-svelte'

import { generateJSON } from './scripts/prime-generation'

import type { ChildProcessByStdio } from 'child_process'

const production = !process.env.ROLLUP_WATCH

await generateJSON()

function serve() {
  let server: ChildProcessByStdio<null, null, null>
  function toExit() {
    if (server) server.kill(0)
  }

  return {
    writeBundle() {
      if (server) return
      server = spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true,
      })

      process.on('SIGTERM', toExit)
      process.on('exit', toExit)
    },
  }
}

const workerFile = globSync('src/web-worker/*.ts')

const workerConfigs = workerFile.map(file => ({
  input: file,
  output: {
    file: path.format({ dir: 'public/build/web-worker', name: path.basename(file, '.ts'), ext: 'js' }),
    format: 'iife',
    inlineDynamicImports: true,
    sourcemap: true,
  },
  plugins: [
    resolve({
      browser: true,
    }),
    json(),
    commonjs(),
    typescript({
      inlineSourceMap: true,
      sourceMap: true,
    }),
    production && terser(),
  ],
}))

const config = {
  input: 'src/main.ts',
  output: {
    external: ['MathJax', 'plotly.js'],
    file: 'public/build/bundle.js',
    format: 'iife',
    globals: {
      MathJax: 'MathJax',
      'plotly.js': 'Plotly',
    },
    inlineDynamicImports: true,
    name: 'app',
    sourcemap: true,
  },
  plugins: [
    svelte({
      compilerOptions: { dev: !production },
      preprocess: sveltePreprocess(),
    }),

    // we'll extract any component CSS out into
    // a separate file - better for performance
    css({
      output: 'bundle.css',
    }),

    virtual(
      Object.fromEntries(
        workerFile
          .map(file => path.basename(file, '.ts'))
          .map(file => [
            `worker:${file}`,
            `export default class BindedWorker extends Worker {
               constructor() {
                 super('build/web-worker/${file}.js')
               }
             }`,
          ])
      )
    ),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    json(),
    commonjs(),
    typescript({
      inlineSourceMap: true,
      sourceMap: true,
    }),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
  ],
  watch: {
    clearScreen: false,
  },
}

export default [config, ...workerConfigs]

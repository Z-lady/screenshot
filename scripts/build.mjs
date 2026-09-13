import { build } from 'esbuild'
import { mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = resolve(root, 'dist')

await mkdir(dist, { recursive: true })

await Promise.all([
  build({
    entryPoints: [resolve(root, 'src/main/index.ts')],
    outfile: resolve(dist, 'main.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['electron'],
    sourcemap: true
  }),

  build({
    entryPoints: [resolve(root, 'src/preload/index.ts')],
    outfile: resolve(dist, 'preload.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['electron'],
    sourcemap: true
  }),

  build({
    entryPoints: [resolve(root, 'src/renderer/main.tsx')],
    outfile: resolve(dist, 'renderer.js'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: ['chrome130'],
    sourcemap: true,
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts'
    }
  })
])

await copyFile(
  resolve(root, 'public/index.html'),
  resolve(dist, 'index.html')
)

console.log('Build complete: dist/')

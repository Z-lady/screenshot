import { build } from 'esbuild'
import { mkdir, copyFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const dist = resolve(root, 'dist')
const mode = process.argv[2] || 'development'

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {}
  }

  const content = await readFile(filePath, 'utf-8')
  const result = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) {
      continue
    }

    const index = line.indexOf('=')
    if (index <= 0) {
      continue
    }

    const key = line.slice(0, index).trim()
    let value = line.slice(index + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

const env = {
  ...(await loadEnvFile(resolve(root, '.env'))),
  ...(await loadEnvFile(resolve(root, `.env.${mode}`)))
}

for (const [key, value] of Object.entries(env)) {
  process.env[key] = value
}

const define = Object.fromEntries(
  Object.entries(env).map(([key, value]) => [
    `process.env.${key}`,
    JSON.stringify(value)
  ])
)

define['process.env.NODE_ENV'] = JSON.stringify(
  mode === 'production' ? 'production' : 'development'
)

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
    sourcemap: true,
    define
  }),

  build({
    entryPoints: [resolve(root, 'src/preload/index.ts')],
    outfile: resolve(dist, 'preload.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['electron'],
    sourcemap: true,
    define
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
    },
    define
  })
])

await copyFile(
  resolve(root, 'public/index.html'),
  resolve(dist, 'index.html')
)

console.log(`Build complete: dist/ (mode=${mode})`)

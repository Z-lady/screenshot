import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadEnvFile } from 'node:process'
import { app } from 'electron'

export type ScreenshotProviderName = 'electron' | 'native'

function resolveEnvPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, '.env')
  }

  return join(process.cwd(), '.env')
}

function loadEnvironment(): string {
  const envPath = resolveEnvPath()

  if (existsSync(envPath)) {
    loadEnvFile(envPath)
  }

  return envPath
}

function parseScreenshotProvider(
  value: string | undefined
): ScreenshotProviderName {
  const normalized = value?.trim().toLowerCase()

  if (!normalized || normalized === 'electron') {
    return 'electron'
  }

  if (normalized === 'native') {
    return 'native'
  }

  throw new Error(
    `Invalid SCREENSHOT_PROVIDER: "${value}". Expected "electron" or "native".`
  )
}

export const envPath = loadEnvironment()

export const env = Object.freeze({
  SCREENSHOT_PROVIDER: parseScreenshotProvider(
    process.env.SCREENSHOT_PROVIDER
  )
})

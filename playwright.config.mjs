import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const installedBrowser = process.platform === 'win32'
  ? ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
  : undefined

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 20000,
  reporter: 'list',
  outputDir: '.test-results',
  use: {
    baseURL: 'http://127.0.0.1:43190',
    viewport: { width: 1120, height: 900 },
    launchOptions: { executablePath: process.env.DSH_TEST_BROWSER ?? installedBrowser },
  },
  webServer: {
    command: 'node test/server.mjs',
    url: 'http://127.0.0.1:43190',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})

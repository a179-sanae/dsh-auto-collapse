import { test, expect } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

for (const historyNodes of [100, 1000, 5000]) {
  test(`${historyNodes} historical nodes: streaming only updates the affected summary`, async ({ page }, testInfo) => {
    test.setTimeout(45000)
    await page.goto('/')
    await page.evaluate(count => {
      const nodes = []
      for (let i = 0; i < count / 2; i++) {
        nodes.push({ id: `p${i}`, kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text: `Body ${i}` }] })
        nodes.push({ id: `t${i}`, kind: 'tool-call', turn: '1', tool: 'read', summary: 'file.txt' })
      }
      nodes.push({ id: 'last-body', kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text: 'Working' }] })
      nodes.push({ id: 'live', kind: 'tool-call', turn: '1', tool: 'bash', state: 'running', summary: 'stream 0' })
      window.fixture.load({ nodes })
    }, historyNodes)
    await expect(page.locator('[data-dshcf-group]')).toHaveCount(historyNodes / 2 + 1)
    const measurements = await page.evaluate(async () => {
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve))
      await frame(); await frame()
      const before = window.fixture.diagnostics()
      const text = document.querySelector('[data-chat-flow-key="live"] .native-summary').firstChild
      const times = []
      for (let i = 0; i < 35; i++) {
        text.data = `stream ${i + 1}`
        await frame(); await frame()
        times.push(window.fixture.diagnostics().lastDurationMs)
      }
      const after = window.fixture.diagnostics()
      times.sort((a, b) => a - b)
      return { before, after, p95: times[Math.floor(times.length * .95)], max: times[times.length - 1] }
    })
    const resultFile = testInfo.outputPath('performance.json')
    mkdirSync(dirname(resultFile), { recursive: true })
    writeFileSync(resultFile, JSON.stringify({ historyNodes, ...measurements }, null, 2))
    await testInfo.attach('plugin-update-cost', { path: resultFile, contentType: 'application/json' })
    expect(measurements.after.structures).toBe(measurements.before.structures)
    expect(measurements.after.groupUpdates).toBe(measurements.before.groupUpdates)
    expect(measurements.p95).toBeLessThan(8)
    expect(measurements.max).toBeLessThan(50)
  })
}

test('stable view has no polling pass over 30 seconds', async ({ page }) => {
  test.setTimeout(40000)
  await page.goto('/')
  await expect(page.locator('[data-dshcf-group]')).toHaveCount(2)
  const before = await page.evaluate(async () => { await new Promise(resolve => setTimeout(resolve, 150)); return window.fixture.diagnostics().passes })
  await page.waitForTimeout(30000)
  expect((await page.evaluate(() => window.fixture.diagnostics())).passes).toBe(before)
})

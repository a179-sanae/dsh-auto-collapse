import { test, expect } from '@playwright/test'

test('completed native turn opens to prose and L2, with consistent collapsed spacing', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: '完成工作', exact: true }).click()
  const groups = page.locator('[data-dshcf-group]:visible')
  await expect(groups).toHaveCount(2)
  await expect(groups.nth(1)).toHaveAttribute('data-status', 'done')
  await page.locator('button[data-turn-process]').click()
  await expect(groups).toHaveCount(0)
  await page.locator('button[data-turn-process]').click()
  await expect(groups).toHaveCount(2)
  const gaps = await page.evaluate(() => {
    const first = document.querySelector('[data-dshcf-group]')
    const before = document.querySelector('[data-chat-flow-key="a1"]')
    const after = document.querySelector('[data-chat-flow-key="a2"]')
    return { before: first.getBoundingClientRect().top - before.getBoundingClientRect().bottom, after: after.getBoundingClientRect().top - first.getBoundingClientRect().bottom }
  })
  expect(gaps.before).toBe(16)
  expect(gaps.after).toBe(16)
  await page.locator('.flow').screenshot({ path: testInfo.outputPath('completed.png'), animations: 'disabled' })
})

test('working summaries fit a narrow viewport without horizontal overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.evaluate(() => {
    window.fixture.setNative('1', { enabled: false })
    window.fixture.patch('tool3', { summary: 'npm run check -- --long-argument-without-breaks-for-narrow-viewport-validation' })
  })
  await expect(page.locator('[data-dshcf-group]:visible')).toHaveCount(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await page.locator('[data-dshcf-group]').evaluateAll(elements => elements.every(element => element.getBoundingClientRect().right <= window.innerWidth))).toBe(true)
  expect(await page.locator('[data-status="running"] .dshcf-group-label').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.locator('.flow').screenshot({ path: testInfo.outputPath('working-narrow.png'), animations: 'disabled' })
})

test('light theme uses host color tokens and expanded native detail stays available', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.addStyleTag({ content: ':root{color-scheme:light;--dsw-alias-label-primary:#222;--dsw-alias-label-secondary:#444;--dsw-alias-label-tertiary:#555}body{background:#fafafa;color:#222}.native-row,.native-turn{color:#555}' })
  await expect(page.locator('[data-dshcf-group]:visible')).toHaveCount(2)
  await page.locator('[data-dshcf-group]').nth(0).click()
  await page.locator('[data-chat-flow-key="think1"] [data-disclosure-row]').click()
  await expect(page.getByText('检查分组边界\n推理全文中的后续内容应由原生组件展示。', { exact: true })).toBeVisible()
  const color = await page.locator('[data-dshcf-group]').first().evaluate(element => getComputedStyle(element).color)
  expect(color).toBe('rgb(85, 85, 85)')
  await page.locator('.flow').screenshot({ path: testInfo.outputPath('expanded-light.png'), animations: 'disabled' })
})

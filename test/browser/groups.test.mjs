import { test, expect } from '@playwright/test'

const user = { id: 'u', kind: 'user', turn: '1', text: 'User' }
const prose = (id, text = id, fields = {}) => ({ id, kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text }], ...fields })
const think = (id, fields = {}) => ({ id, kind: 'assistant-step', turn: '1', blocks: [{ kind: 'think', text: `${id} summary\n${id} FULL DETAIL` }], ...fields })
const tool = (id, fields = {}) => ({ id, kind: 'tool-call', turn: '1', tool: 'bash', summary: id, text: `${id} RESULT`, ...fields })
const context = (id, fields = {}) => ({ id, kind: 'context', turn: '1', summary: id, text: `${id} FULL CONTEXT`, ...fields })
const native = { id: 'native', kind: 'turn-process', turn: '1' }
const groups = page => page.locator('[data-dshcf-group]:visible')

async function mount(page, nodes, nativeTurns = {}) {
  await page.goto('/')
  await page.evaluate(input => window.fixture.load(input), { nodes, nativeTurns })
}

test('mixed thinking, tools, context form one L2 between prose; native details stay intact', async ({ page }) => {
  await mount(page, [user, prose('a'), think('t'), tool('browser', { tool: 'browser' }), context('ctx'), tool('edit', { tool: 'edit' }), prose('b')])
  await expect(groups(page)).toHaveCount(1)
  await expect(groups(page)).toContainText('已思考 · 使用了浏览器 · 已注入上下文 · 编辑了文件')
  await expect(page.getByText('a', { exact: true })).toBeVisible()
  await expect(page.getByText('b', { exact: true })).toBeVisible()
  await groups(page).click()
  await expect(page.locator('[data-chat-flow-key="t"] [data-disclosure-row]')).toBeVisible()
  await page.locator('[data-chat-flow-key="t"] [data-disclosure-row]').click()
  await expect(page.getByText('t summary\nt FULL DETAIL', { exact: true })).toBeVisible()
  await page.locator('[data-chat-flow-key="ctx"] [data-disclosure-row]').click()
  await expect(page.getByText('ctx FULL CONTEXT', { exact: true })).toBeVisible()
  await groups(page).click()
  await groups(page).click()
  await expect(page.getByText('t summary\nt FULL DETAIL', { exact: true })).toBeVisible()
  await expect(page.getByText('ctx FULL CONTEXT', { exact: true })).toBeVisible()
  await expect(page.locator('.dshcf-processed, .dshcf-merged-body')).toHaveCount(0)
})

test('one assistant step can contain think/body/think and create separate work intervals', async ({ page }) => {
  await mount(page, [user, { id: 'mixed', kind: 'assistant-step', turn: '1', blocks: [
    { kind: 'think', text: 'first thought' }, { kind: 'text', text: 'BODY\n\nSECOND PARAGRAPH' }, { kind: 'think', text: 'second thought' },
  ] }, context('ctx'), tool('cmd'), prose('final')])
  await expect(groups(page)).toHaveCount(2)
  await expect(page.getByText('BODY', { exact: true })).toBeVisible()
  await expect(page.getByText('SECOND PARAGRAPH', { exact: true })).toBeVisible()
  await groups(page).nth(1).click()
  await expect(page.locator('[data-variant="think"]').nth(0)).toBeHidden()
  await expect(page.locator('[data-variant="think"]').nth(1)).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="ctx"]')).toBeVisible()
})

test('native L1 collapse and reopen preserve L2 and its expansion intent', async ({ page }) => {
  await mount(page, [user, native, prose('a', 'A', { member: true }), think('t', { member: true }), context('ctx', { member: true }), tool('cmd', { member: true }), prose('final')], { '1': { enabled: true, open: true } })
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await page.locator('[data-chat-flow-key="t"] [data-disclosure-row]').click()
  await page.locator('button[data-turn-process]').click()
  await expect(groups(page)).toHaveCount(0)
  await expect(page.getByText('final', { exact: true })).toBeVisible()
  await page.locator('button[data-turn-process]').click()
  await expect(groups(page)).toHaveCount(1)
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('t summary\nt FULL DETAIL', { exact: true })).toBeVisible()
})

test('context outside native range retains an accessible L2; expanding it opens native L1', async ({ page }) => {
  await mount(page, [user, native, context('outside'), think('t', { member: true }), tool('cmd', { member: true }), prose('final')], { '1': { enabled: true, open: false } })
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await expect(page.locator('button[data-turn-process]')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-chat-flow-key="outside"]')).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="t"] [data-disclosure-row]')).toBeVisible()
})

test('native inline reasoning hides the overlay without touching final prose', async ({ page }) => {
  await mount(page, [user, native, { id: 'answer', kind: 'assistant-step', turn: '1', inline: true, blocks: [
    { kind: 'think', text: 'inline summary\ninline full detail' }, { kind: 'text', text: 'FINAL BODY' },
  ] }], { '1': { enabled: true, open: false } })
  await expect(groups(page)).toHaveCount(0)
  await expect(page.getByText('FINAL BODY', { exact: true })).toBeVisible()
  await page.locator('button[data-turn-process]').click()
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await expect(page.locator('[data-variant="think"]')).toBeVisible()
  await expect(page.getByText('FINAL BODY', { exact: true })).toBeVisible()
})

test('SVG, images, painted containers and paragraphs remain visible', async ({ page }) => {
  await mount(page, [user, think('t'), { id: 'answer', kind: 'assistant-step', turn: '1', blocks: [
    { kind: 'text', text: 'VISIBLE BODY' }, { kind: 'svg' }, { kind: 'painted' }, { kind: 'image' },
  ] }])
  await expect(groups(page)).toHaveCount(1)
  await expect(page.locator('.diagram svg')).toBeVisible()
  await expect(page.locator('.painted')).toBeVisible()
  await expect(page.getByAltText('回答图片')).toBeVisible()
  expect(await page.locator('.diagram').evaluate(element => element.getBoundingClientRect().height)).toBe(70)
  expect(await page.locator('.painted').evaluate(element => element.getBoundingClientRect().height)).toBe(35)
})

test('streaming extends one group; prose creates the next; finished groups remain', async ({ page }) => {
  await mount(page, [user, prose('a'), tool('cmd', { state: 'running', summary: 'initial' })])
  await expect(groups(page)).toHaveCount(1)
  const id = await groups(page).getAttribute('data-dshcf-group')
  await page.evaluate(() => window.fixture.patch('cmd', { summary: 'newest command' }))
  await expect(groups(page)).toContainText('newest command')
  await page.evaluate(() => window.fixture.append([{ id: 'ctx', kind: 'context', turn: '1', summary: 'new context' }]))
  await expect(groups(page)).toHaveCount(1)
  await expect(groups(page)).toHaveAttribute('data-dshcf-group', id)
  await page.evaluate(() => window.fixture.patch('cmd', { state: 'ok' }))
  await expect(groups(page)).toContainText('运行了命令')
  await page.evaluate(nodes => window.fixture.append(nodes), [prose('b'), think('later')])
  await expect(groups(page)).toHaveCount(2)
  await expect(groups(page).nth(0)).toHaveAttribute('data-dshcf-group', id)
})

test('uninstall restores original nodes/styles/native hidden; repeated install has one controller', async ({ page }) => {
  await mount(page, [user, native, context('outside'), tool('cmd', { member: true }), prose('final')], { '1': { enabled: true, open: false } })
  await expect(groups(page)).toHaveCount(1)
  await page.evaluate(() => window.fixture.install())
  await expect(groups(page)).toHaveCount(1)
  await page.evaluate(() => window.fixture.stop())
  await expect(page.locator('[data-dshcf-group], [data-dshcf-folded], #dshcf-v2-style')).toHaveCount(0)
  await expect(page.locator('[data-chat-flow-key="cmd"]')).toHaveAttribute('hidden', 'until-found')
  await expect(page.locator('[data-chat-flow-key="outside"]')).not.toHaveAttribute('hidden')
})

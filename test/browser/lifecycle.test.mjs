import { test, expect } from '@playwright/test'

const groups = page => page.locator('[data-dshcf-group]:visible')
const tool = (id, fields = {}) => ({ id, kind: 'tool-call', turn: '1', tool: 'bash', summary: id, text: `${id} RESULT`, ...fields })
const prose = id => ({ id, kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text: id }] })
async function mount(page, nodes, nativeTurns = {}) {
  await page.goto('/')
  await page.evaluate(input => window.fixture.load(input), { nodes, nativeTurns })
}

test('same-key host replacement and a removed overlay are repaired without resetting L2', async ({ page }) => {
  await mount(page, [prose('left'), tool('cmd'), prose('right')])
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  const id = await groups(page).getAttribute('data-dshcf-group')
  await page.evaluate(() => window.fixture.patch('cmd', { renderKey: 'new-react-node' }))
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-chat-call-id="cmd"]')).toBeVisible()
  await page.locator('[data-dshcf-group]').evaluate(element => element.remove())
  await expect(groups(page)).toHaveCount(1)
  await expect(groups(page)).toHaveAttribute('data-dshcf-group', id)
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
})

test('changing sessions resets L2 even if the host reuses message keys', async ({ page }) => {
  const nodes = [prose('left'), tool('cmd'), prose('right')]
  await mount(page, nodes)
  await groups(page).click()
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
  await page.evaluate(nodes => window.fixture.load({ nodes }), nodes)
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('[data-chat-call-id="cmd"]')).toBeHidden()
})

test('external display and its important priority survive plugin cleanup', async ({ page }) => {
  await mount(page, [prose('left'), tool('cmd'), prose('right')])
  await expect(groups(page)).toHaveCount(1)
  await page.locator('[data-chat-flow-key="cmd"]').evaluate(element => element.style.setProperty('display', 'none', 'important'))
  await expect(groups(page)).toHaveCount(0)
  await page.evaluate(() => window.fixture.stop())
  expect(await page.locator('[data-chat-flow-key="cmd"]').evaluate(element => [element.style.display, element.style.getPropertyPriority('display'), element.getAttribute('hidden')])).toEqual(['none', 'important', null])
})

test('keyboard activation and selected native tools reveal the correct group', async ({ page }) => {
  await mount(page, [prose('a'), tool('one'), prose('b'), tool('two')])
  await expect(groups(page)).toHaveCount(2)
  await groups(page).nth(0).focus()
  await page.keyboard.press('Enter')
  await expect(groups(page).nth(0)).toHaveAttribute('aria-expanded', 'true')
  await expect(groups(page).nth(1)).toHaveAttribute('aria-expanded', 'false')
  await page.evaluate(() => window.fixture.patch('two', { selected: true }))
  await expect(groups(page).nth(1)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('[data-chat-call-id="two"]')).toBeVisible()
})

test('waiting user input remains accessible and cannot be auto-hidden', async ({ page }) => {
  await mount(page, [prose('a'), tool('one', { state: 'waiting', input: true, initialOpen: true })])
  await expect(page.getByRole('textbox', { name: '工具要求的输入' })).toBeVisible()
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
})

test('revealing a selected native tool does not steal typing focus', async ({ page }) => {
  await mount(page, [{ id: 'native', kind: 'turn-process', turn: '1' }, tool('cmd', { member: true }), prose('final')], { '1': { enabled: true, open: false } })
  await expect(groups(page)).toHaveCount(0)
  await page.evaluate(() => {
    const input = document.createElement('input')
    input.id = 'draft-input'
    document.querySelector('.fixture-controls').append(input)
    input.focus()
    window.fixture.patch('cmd', { selected: true })
  })
  await expect(page.locator('button[data-turn-process]')).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#draft-input')).toBeFocused()
})

test('native Normal mode retains L2 and never adds a synthetic L1', async ({ page }) => {
  await mount(page, [{ id: 'native', kind: 'turn-process', turn: '1' }, prose('left'), tool('cmd', { member: true }), prose('right')], { '1': { enabled: true, open: false } })
  await expect(groups(page)).toHaveCount(0)
  await page.evaluate(() => window.fixture.setNative('1', { enabled: false }))
  await expect(groups(page)).toHaveCount(1)
  await expect(page.locator('.dshcf-processed')).toHaveCount(0)
  await groups(page).click()
  await expect(page.locator('[data-chat-call-id="cmd"]')).toBeVisible()
})

test('beforematch expands both the native turn and L2 without altering native detail state', async ({ page }) => {
  await mount(page, [{ id: 'native', kind: 'turn-process', turn: '1' }, tool('cmd', { member: true, initialOpen: true }), prose('final')], { '1': { enabled: true, open: false } })
  await expect(groups(page)).toHaveCount(0)
  await page.locator('[data-chat-flow-key="cmd"]').evaluate(element => element.dispatchEvent(new Event('beforematch', { bubbles: true })))
  await expect(page.locator('button[data-turn-process]')).toHaveAttribute('aria-expanded', 'true')
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('cmd RESULT', { exact: true })).toBeVisible()
})

test('real browser text-fragment search can find folded work', async ({ page }) => {
  await mount(page, [prose('left'), tool('cmd', { initialOpen: true, text: 'SEARCH_NEEDLE_4821' }), prose('right')])
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'false')
  await page.evaluate(() => {
    const link = document.createElement('a')
    link.id = 'search-work'
    link.href = '#:~:text=SEARCH_NEEDLE_4821'
    link.textContent = 'Search hidden work'
    document.querySelector('.fixture-controls').append(link)
  })
  await page.locator('#search-work').click()
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('SEARCH_NEEDLE_4821', { exact: true })).toBeVisible()
})

test('reduced motion disables the running summary pulse', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mount(page, [prose('a'), tool('cmd', { state: 'running' })])
  await expect(groups(page)).toHaveAttribute('data-status', 'running')
  expect(await page.locator('.dshcf-group-label').evaluate(element => getComputedStyle(element).animationName)).toBe('none')
})

test('nested tool calls remain owned by their original native parent', async ({ page }) => {
  await mount(page, [prose('a'), tool('cmd', { nested: true, initialOpen: true }), prose('b')])
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await expect(page.locator('[data-subcalls] [data-chat-call-id="nested"]')).toBeVisible()
  expect((await page.evaluate(() => window.fixture.diagnostics())).items).toBe(1)
})

test('status host updates, late settings, blank text and reconnect are independent of grouping', async ({ page }) => {
  await mount(page, [prose('a'), tool('cmd')])
  await page.evaluate(() => window.fixture.status('深度求索中... 1秒'))
  await expect(page.getByRole('status')).toHaveText('Deep sleeping... 1秒')
  const before = await page.evaluate(() => window.fixture.diagnostics())
  await page.evaluate(() => window.fixture.status('深度求索中... 2秒'))
  await expect(page.getByRole('status')).toHaveText('Deep sleeping... 2秒')
  expect((await page.evaluate(() => window.fixture.diagnostics())).structures).toBe(before.structures)
  await page.evaluate(() => window.fixture.settings('正在工作 $&'))
  await expect(page.getByRole('status')).toHaveText('正在工作 $& 2秒')
  await page.evaluate(() => window.fixture.disconnectSettings())
  await expect(page.getByRole('status')).toHaveText('Deep sleeping... 2秒')
  await page.evaluate(() => window.fixture.settings(''))
  await expect(page.getByRole('status')).toHaveText('深度求索中... 2秒')
  await page.evaluate(() => window.fixture.stop())
  await expect(page.getByRole('status')).toHaveText('深度求索中... 2秒')
})

test('settings saving disables editing and read-only scopes cannot save', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.fixture.settings('initial'))
  await page.getByRole('button', { name: '展开设置: 状态提示词', exact: true }).click()
  const input = page.getByLabel('自定义状态提示词', { exact: true })
  await input.fill('SAVE_A')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(input).toBeDisabled()
  await page.evaluate(() => window.fixture.resolveSave())
  await expect(input).toBeEnabled()
  await expect(input).toHaveValue('SAVE_A')
  await expect(page.getByText('未保存', { exact: true })).toHaveCount(0)
  await page.evaluate(() => window.fixture.settings('readonly', false))
  await page.getByRole('button', { name: '展开设置: 状态提示词', exact: true }).click()
  await expect(input).toBeDisabled()
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
})

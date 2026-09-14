import { test, expect } from '@playwright/test'

const errors = new WeakMap()
const stderr = [
  'dsh : dsh: pnpm failed in profile directory C:\\Users\\fixture\\.dsh\\profiles\\desktop',
  '    + CategoryInfo          : NotSpecified: (:) [], RemoteException',
  '    + FullyQualifiedErrorId : NativeCommandError',
].join('\n')
const args = { command: 'Write-Error "synthetic command failure"; exit 1', description: '失败命令', workdir: 'C:\\work' }
const running = (id, arguments_ = args) => ({ callId: id, name: 'pwsh', argsRaw: JSON.stringify(arguments_), subCalls: [] })
const result = (id, fields = {}, arguments_ = args) => ({
  kind: 'tool-result', seq: 1, time: 1, callId: id, callTime: 0,
  call: { name: 'pwsh', argsRaw: JSON.stringify(arguments_) },
  isError: false, content: [{ type: 'text', text: `${stderr}\n[exit code: 1]` }], subCalls: [],
  ...fields,
})
const tool = (id, block) => ({ id, kind: 'tool-call', turn: '1', member: true, nativeBlock: block })
const prose = id => ({ id, kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text: id }] })
const groups = page => page.locator('[data-dshcf-group]:visible')
const row = (page, id) => page.locator(`[data-chat-flow-key="${id}"] [data-disclosure-row]`).first()
const terminal = (page, id) => page.locator(`[data-chat-flow-key="${id}"] [data-terminal]`)

test.beforeEach(async ({ page }) => {
  const captured = []
  errors.set(page, captured)
  page.on('pageerror', error => captured.push(error.message))
  page.on('console', message => { if (message.type() === 'error') captured.push(message.text()) })
  await page.goto('/')
  expect(await page.evaluate(() => window.fixture.hostVersion)).toBe('0.1.5-rc.2')
})

test.afterEach(async ({ page }) => {
  expect(errors.get(page), 'native renderer and plugin must not log or throw errors').toEqual([])
})

test('official pwsh nonzero exits, retry success and turn completion retain all disclosure levels', async ({ page }, testInfo) => {
  await page.evaluate(nodes => window.fixture.load({ nodes, nativeTurns: { '1': { enabled: false, open: true } } }), [
    prose('before'), { id: 'native', kind: 'turn-process', turn: '1' },
    tool('failed-1', result('failed-1')), tool('failed-2', result('failed-2')),
    tool('retry', running('retry', { ...args, command: 'exit 0', description: '重试命令' })),
  ])
  await expect(groups(page)).toHaveCount(1)
  await expect(groups(page)).toHaveAttribute('data-status', 'running')
  await expect(groups(page)).toContainText('重试命令')
  await page.evaluate(block => window.fixture.patch('retry', { nativeBlock: block }), result('retry', {
    content: [{ type: 'text', text: 'retry succeeded\n[exit code: 0]' }],
  }, { ...args, command: 'exit 0', description: '重试命令' }))
  await expect(groups(page)).toHaveAttribute('data-status', 'error')
  await page.evaluate(node => {
    window.fixture.append([node])
    window.fixture.setNative('1', { enabled: true, open: false })
  }, prose('final answer'))
  await expect(groups(page)).toHaveCount(0)
  await expect(page.getByText('final answer', { exact: true })).toBeVisible()
  await page.locator('button[data-turn-process]').click()
  await expect(groups(page)).toHaveCount(1)
  await expect(groups(page)).toContainText('运行了命令 · 出错')
  await groups(page).click()
  await row(page, 'failed-1').click()
  await expect(terminal(page, 'failed-1')).toBeVisible()
  await expect(terminal(page, 'failed-1')).toContainText('NativeCommandError')
  await expect(terminal(page, 'failed-1')).toContainText('exit code: 1')
  await page.locator('button[data-turn-process]').click()
  await page.locator('button[data-turn-process]').click()
  await expect(terminal(page, 'failed-1')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('native-pwsh-failure.png'), fullPage: true })
})

test('official pwsh swaps an expanded running terminal for a structured error body', async ({ page }) => {
  await page.evaluate(nodes => window.fixture.load({ nodes }), [prose('before'), tool('cmd', running('cmd'))])
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await row(page, 'cmd').click()
  await expect(terminal(page, 'cmd')).toBeVisible()
  await page.evaluate(block => window.fixture.patch('cmd', { nativeBlock: block }), result('cmd', {
    isError: true, error: { name: 'RemoteException', code: 'native_command_error' },
    content: [{ type: 'text', text: stderr }],
  }))
  await expect(groups(page)).toHaveAttribute('data-status', 'error')
  await expect(terminal(page, 'cmd')).toHaveCount(0)
  await expect(page.locator('[data-chat-flow-key="cmd"] [data-error]')).toContainText('NativeCommandError')
  await expect(row(page, 'cmd')).toHaveAttribute('aria-expanded', 'true')
})

for (const [name, block, status, text] of [
  ['persistent shell result', result('cmd', {}, { command: args.command }), 'done', 'NativeCommandError'],
  ['result without its call head', result('cmd', { call: null, isError: true, content: [], error: { name: 'RemoteException', code: 'native_command_error' } }), 'error', 'RemoteException: native_command_error'],
  ['incomplete argument JSON', result('cmd', { call: { name: 'pwsh', argsRaw: '{"command":' }, isError: true }), 'error', 'NativeCommandError'],
  ['multiple result blocks', result('cmd', { content: [{ type: 'text', text: stderr }, { type: 'text', text: '[exit code: 1]' }] }), 'done', 'NativeCommandError'],
]) {
  test(`official pwsh generic fallback handles ${name}`, async ({ page }) => {
    await page.evaluate(nodes => window.fixture.load({ nodes }), [prose('before'), tool('cmd', block), prose('after')])
    await expect(groups(page)).toHaveCount(1)
    await expect(groups(page)).toHaveAttribute('data-status', status)
    await groups(page).click()
    await row(page, 'cmd').click()
    await expect(terminal(page, 'cmd')).toHaveCount(0)
    await expect(page.locator('[data-chat-flow-key="cmd"]')).toContainText(text)
    await expect(page.getByText('after', { exact: true })).toBeVisible()
  })
}

test('nested failed pwsh calls use the native call tree without extra plugin summaries', async ({ page }) => {
  const child = result('child', { parentCallId: 'cmd', isError: true, content: [{ type: 'text', text: stderr }] })
  await page.evaluate(nodes => window.fixture.load({ nodes }), [prose('before'), tool('cmd', result('cmd', { subCalls: [child] })), prose('after')])
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await expect(page.locator('[data-subcalls] [data-chat-call-id="child"]')).toBeVisible()
  await page.locator('[data-chat-call-id="child"] [data-disclosure-row]').click()
  await expect(page.locator('[data-chat-call-id="child"] [data-error]')).toContainText('NativeCommandError')
  await expect(groups(page)).toHaveCount(1)
})

test('0.1.5 reasoning summaries omit bold markers while native details retain them', async ({ page }) => {
  await page.evaluate(nodes => window.fixture.load({ nodes }), [
    prose('before'), { id: 'thinking', kind: 'assistant-step', turn: '1', blocks: [{ kind: 'think', text: '**summary**\ncomplete **detail**' }] }, prose('after'),
  ])
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await expect(row(page, 'thinking')).toContainText('summary')
  await expect(row(page, 'thinking')).not.toContainText('**')
  await row(page, 'thinking').click()
  await expect(page.getByText('**summary**\ncomplete **detail**', { exact: true })).toBeVisible()
})

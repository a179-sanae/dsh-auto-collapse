import { test, expect } from '@playwright/test'

const work = (id, fields = {}) => ({ id, kind: 'tool-call', turn: '1', tool: 'bash', summary: id, ...fields })
const text = (id, turn = '1') => ({ id, kind: 'assistant-step', turn, blocks: [{ kind: 'text', text: id }] })
const group = page => page.locator('[data-dshcf-group]:visible')

test('render failure restores native content once and retries only on a new host change', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.originalBefore = Element.prototype.before
    Element.prototype.before = function (...nodes) {
      if (nodes.some(node => node instanceof Element && node.hasAttribute('data-dshcf-group'))) throw new Error('Injected overlay placement failure')
      return window.originalBefore.apply(this, nodes)
    }
    window.fixture.load({ nodes: [
      { id: 'new-work', kind: 'tool-call', turn: '1', tool: 'bash', summary: 'work' },
      { id: 'answer', kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text: 'Native answer survives' }] },
    ] })
  })
  await expect(page.locator('[data-dshcf-group], [data-dshcf-folded]')).toHaveCount(0)
  await expect(page.locator('[data-chat-flow-key="new-work"]')).toBeVisible()
  const stable = await page.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 200))
    const before = window.fixture.diagnostics().passes
    await new Promise(resolve => setTimeout(resolve, 200))
    return { before, after: window.fixture.diagnostics().passes }
  })
  expect(stable.after).toBe(stable.before)
  await page.evaluate(() => {
    Element.prototype.before = window.originalBefore
    window.fixture.patch('new-work', { state: 'running' })
  })
  await expect(group(page)).toHaveCount(1)
  await expect(page.getByText('Native answer survives', { exact: true })).toBeVisible()
})

test('turn/user/steering fences split groups; unscoped context can join its actual adjacent work', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(nodes => window.fixture.load({ nodes }), [
    { id: 'u', kind: 'user', text: 'user' },
    { id: 'ctx', kind: 'context', summary: 'context without a native turn attribute' }, work('first'),
    { id: 'steer', kind: 'steering', turn: '1', text: 'steering' }, work('second'),
    work('third', { turn: '2' }), text('final', '2'),
  ])
  await expect(group(page)).toHaveCount(3)
  await expect(group(page).nth(0)).toContainText('已注入上下文 · 运行了命令')
  await group(page).nth(1).click()
  await expect(page.locator('[data-chat-flow-key="first"]')).toBeHidden()
  await expect(page.locator('[data-chat-flow-key="second"]')).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="third"]')).toBeHidden()
})

test('commands and compaction share their interval; unknown surfaces remain visible boundaries', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(nodes => window.fixture.load({ nodes }), [
    text('a'), { id: 'cmd', kind: 'command', turn: '1', summary: 'command' },
    { id: 'compact', kind: 'manual-compaction', turn: '1', summary: 'compact' },
    { id: 'unknown', kind: 'new-host-kind', turn: '1', text: 'UNKNOWN SURFACE' },
    work('tool'), text('b'),
  ])
  await expect(group(page)).toHaveCount(2)
  await expect(page.getByText('UNKNOWN SURFACE', { exact: true })).toBeVisible()
  await group(page).nth(0).click()
  await expect(page.locator('[data-chat-flow-key="cmd"]')).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="compact"]')).toBeVisible()
})

test('late prose splits an existing mixed group and never hides the new text', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(nodes => window.fixture.load({ nodes }), [text('before'), work('one'), { id: 'late', kind: 'assistant-step', turn: '1', blocks: [] }, work('two')])
  // The opaque empty renderer may be a conservative boundary; once real prose arrives it is always one.
  await page.evaluate(() => window.fixture.patch('late', { blocks: [{ kind: 'text', text: 'LATE BODY' }] }))
  await expect(group(page)).toHaveCount(2)
  await expect(page.getByText('LATE BODY', { exact: true })).toBeVisible()
})

test('a formerly work-only assistant gaining prose releases the old whole-seat hide', async ({ page }) => {
  await page.goto('/')
  const thought = { kind: 'think', text: 'summary\nFULL THOUGHT' }
  await page.evaluate(nodes => window.fixture.load({ nodes }), [
    text('before'), { id: 'growing', kind: 'assistant-step', turn: '1', blocks: [thought] }, work('after'),
  ])
  await expect(group(page)).toHaveCount(1)
  await page.evaluate(thought => window.fixture.patch('growing', { blocks: [thought, { kind: 'text', text: 'ARRIVED PROSE' }] }), thought)
  await expect(group(page)).toHaveCount(2)
  await expect(page.getByText('ARRIVED PROSE', { exact: true })).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="growing"]')).not.toHaveAttribute('hidden')
  await expect(page.locator('[data-chat-flow-key="growing"] [data-variant="think"]')).toBeHidden()
  await expect(page.locator('[data-chat-flow-key="after"]')).toBeHidden()
})

test('out-of-order history insertion converges without duplicate or orphan summaries', async ({ page }) => {
  await page.goto('/')
  const ordered = [text('a'), work('one'), { id: 'ctx', kind: 'context', turn: '1', summary: 'context' }, text('b'), work('two'), text('final')]
  await page.evaluate(() => window.fixture.load({ nodes: [] }))
  const mounted = new Set()
  for (const index of [4, 2, 5, 0, 3, 1]) {
    mounted.add(index)
    await page.evaluate(nodes => window.fixture.replaceNodes(nodes), ordered.filter((_, index) => mounted.has(index)))
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  await expect(group(page)).toHaveCount(2)
  for (const id of ['a', 'b', 'final']) await expect(page.getByText(id, { exact: true })).toBeVisible()
  await group(page).nth(0).click()
  await expect(page.locator('[data-chat-flow-key="one"]')).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="ctx"]')).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="two"]')).toBeHidden()
})

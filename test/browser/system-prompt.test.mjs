import { test, expect } from '@playwright/test'

const user = { id: 'u', kind: 'user', turn: '1', text: 'Review this project' }
const native = { id: 'native', kind: 'turn-process', turn: '1' }
const prompt = { id: 'prompt', kind: 'system-prompt', turn: '1', text: 'SYNTHETIC SYSTEM PROMPT\nSECOND LINE' }
const context = { id: 'context', kind: 'context', turn: '1', member: true, summary: 'Project context', text: 'Synthetic context' }
const think = { id: 'think', kind: 'assistant-step', turn: '1', member: true, blocks: [{ kind: 'think', text: 'Reviewing the project' }] }
const prose = { id: 'prose', kind: 'assistant-step', turn: '1', member: true, blocks: [{ kind: 'text', text: 'Intermediate prose' }] }
const final = { id: 'final', kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text: 'Final answer' }] }
const groups = page => page.locator('[data-dshcf-group]:visible')
const promptSeat = page => page.locator('[data-chat-flow-key="prompt"]')
const turnButton = page => page.locator('button[data-turn-process="1"]')

async function mount(page, nodes = [user, native, context, prompt, think, prose, final], nativeTurns = { '1': { enabled: true, open: false } }) {
  await page.goto('/')
  await page.evaluate(input => window.fixture.load(input), { nodes, nativeTurns })
}

test('system prompt follows L1 and joins adjacent context/thinking in one L2 without resetting native details', async ({ page }, testInfo) => {
  await mount(page)
  await expect(turnButton(page)).toHaveAttribute('aria-expanded', 'false')
  // The host deliberately leaves this row outside its process membership.
  await expect(promptSeat(page)).not.toHaveAttribute('data-turn-process-member')
  await expect(promptSeat(page)).not.toHaveAttribute('data-turn-process-hidden')
  await expect(promptSeat(page)).toBeHidden()
  await expect(groups(page)).toHaveCount(0)
  await expect(page.getByText('Final answer', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('system-prompt-l1-closed.png') })

  await turnButton(page).click()
  await expect(groups(page)).toHaveCount(1)
  await expect(groups(page)).toContainText('已注入上下文 · 已思考')
  await expect(promptSeat(page)).toBeHidden()
  await expect(page.getByText('Intermediate prose', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('system-prompt-l2-closed.png') })
  await groups(page).click()
  await expect(promptSeat(page).locator('[data-disclosure-row]')).toBeVisible()
  await expect(promptSeat(page).locator('[data-system-prompt-body]')).toHaveCount(0)
  await promptSeat(page).locator('[data-disclosure-row]').click()
  await expect(promptSeat(page).locator('[data-system-prompt-body]')).toHaveText(prompt.text)
  await groups(page).click()
  await expect(promptSeat(page)).toBeHidden()
  await groups(page).click()
  await expect(promptSeat(page).locator('[data-system-prompt-body]')).toBeVisible()

  await turnButton(page).click()
  await expect(promptSeat(page)).toBeHidden()
  await expect(groups(page)).toHaveCount(0)
  await turnButton(page).click()
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(promptSeat(page).locator('[data-system-prompt-body]')).toBeVisible()
  await expect(promptSeat(page).locator('[data-system-prompt-body]')).toHaveText(prompt.text)
})

test('system prompts group normally during work and when native compact mode is disabled', async ({ page }) => {
  await mount(page, [user, native, context, prompt, think, final], { '1': { enabled: false, open: false } })
  await expect(turnButton(page)).toHaveCount(0)
  await expect(groups(page)).toHaveCount(1)
  await expect(promptSeat(page)).toBeHidden()
  await groups(page).click()
  await expect(promptSeat(page).locator('[data-disclosure-row]')).toBeVisible()
})

test('an unscoped system prompt keeps an accessible L2 when the adjacent native turn is closed', async ({ page }) => {
  await mount(page, [user, native, { ...prompt, turn: undefined }, think, final])
  await expect(groups(page)).toHaveCount(1)
  await expect(promptSeat(page)).toBeHidden()
  await groups(page).click()
  await expect(promptSeat(page).locator('[data-disclosure-row]')).toBeVisible()
})

test('system prompts follow only their own native turn across multiple disclosures', async ({ page }) => {
  await mount(page, [user, native, prompt, final,
    { ...user, id: 'u2', turn: '2' }, { ...native, id: 'native2', turn: '2' },
    { ...prompt, id: 'prompt2', turn: '2' }, { ...final, id: 'final2', turn: '2' },
  ], { '1': { enabled: true, open: false }, '2': { enabled: true, open: true } })
  await expect(groups(page)).toHaveCount(1)
  await expect(promptSeat(page)).toBeHidden()
  await groups(page).click()
  await expect(page.locator('[data-chat-flow-key="prompt2"] [data-disclosure-row]')).toBeVisible()
  await expect(turnButton(page)).toHaveAttribute('aria-expanded', 'false')
  await page.locator('button[data-turn-process="2"]').click()
  await expect(groups(page)).toHaveCount(0)
  await expect(page.locator('[data-chat-flow-key="prompt2"]')).toBeHidden()
  await turnButton(page).click()
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await expect(promptSeat(page).locator('[data-disclosure-row]')).toBeVisible()
  await expect(page.locator('[data-chat-flow-key="prompt2"]')).toBeHidden()
})

test('late addition and removal of the owning native disclosure reprojects the system prompt', async ({ page }) => {
  const nodes = [user, prompt, final]
  await mount(page, nodes)
  await expect(groups(page)).toHaveCount(1)
  await page.evaluate(nodes => window.fixture.replaceNodes(nodes), [user, native, prompt, final])
  await expect(turnButton(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(groups(page)).toHaveCount(0)
  await expect(promptSeat(page)).toBeHidden()
  await page.evaluate(nodes => window.fixture.replaceNodes(nodes), nodes)
  await expect(turnButton(page)).toHaveCount(0)
  await expect(groups(page)).toHaveCount(1)
  await groups(page).click()
  await expect(promptSeat(page).locator('[data-disclosure-row]')).toBeVisible()
})

test('beforematch on a system prompt opens both folds while keeping its native details closed', async ({ page }) => {
  await mount(page)
  await expect(promptSeat(page)).toBeHidden()
  await promptSeat(page).evaluate(element => element.dispatchEvent(new Event('beforematch', { bubbles: true })))
  await expect(turnButton(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(groups(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(promptSeat(page).locator('[data-disclosure-row]')).toBeVisible()
  await expect(promptSeat(page).locator('[data-system-prompt-body]')).toHaveCount(0)
})

test('uninstall restores the host-independent system prompt and preserves native member hiding', async ({ page }) => {
  await mount(page)
  await expect(promptSeat(page)).toBeHidden()
  await page.evaluate(() => window.fixture.stop())
  await expect(promptSeat(page)).toBeVisible()
  await expect(promptSeat(page)).not.toHaveAttribute('hidden')
  await expect(page.locator('[data-chat-flow-key="think"]')).toHaveAttribute('hidden', 'until-found')
  await expect(page.locator('[data-dshcf-group], [data-dshcf-folded], #dshcf-v2-style')).toHaveCount(0)
})

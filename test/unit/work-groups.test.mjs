import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupWork, GroupState, resolveTurns } from '../../.test-build/work-groups.js'
import { summarize, toolAction } from '../../.test-build/summary.js'

const work = (id, kind = 'tool', turn = '1') => ({ type: 'work', id, kind, turn })
const prose = id => ({ type: 'boundary', id, turn: '1', hard: false })
const fence = id => ({ type: 'boundary', id, turn: null, hard: true })

test('all work kinds share exactly one interval between prose', () => {
  const groups = groupWork([prose('a'), work('think', 'think'), work('browser'), work('context', 'context'), work('cmd', 'command'), prose('b')])
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].items, ['think', 'browser', 'context', 'cmd'])
})
test('prefix, suffix, single-item and pure-context groups are real groups', () => {
  assert.deepEqual(groupWork([work('ctx', 'context'), prose('a'), work('t', 'think')]).map(group => group.items), [['ctx'], ['t']])
  assert.equal(groupWork([prose('a'), prose('b')]).length, 0)
})
test('prose, user/steering fences and turn changes cannot be crossed', () => {
  assert.deepEqual(groupWork([work('a'), prose('body'), work('b'), fence('steering'), work('c'), work('d', 'tool', '2')]).map(group => group.items), [['a'], ['b'], ['c'], ['d']])
})
test('unscoped context inherits only an unambiguous adjacent turn', () => {
  assert.deepEqual(resolveTurns([fence('u'), work('ctx', 'context', null), work('t')]).map(token => token.turn), [null, '1', '1'])
  assert.equal(resolveTurns([work('a', 'tool', '1'), work('ctx', 'context', null), work('b', 'tool', '2')])[1].turn, null)
  assert.equal(resolveTurns([work('a'), fence('user'), work('ctx', 'context', null)])[2].turn, null)
})
test('completion and new right-hand prose keep the group identity and open state', () => {
  const state = new GroupState()
  const first = groupWork([prose('left'), work('tool')])
  state.reconcile(first)
  state.setExpanded(first[0].id, true)
  const next = groupWork([prose('left'), work('tool'), work('ctx', 'context'), prose('right'), work('later')])
  state.reconcile(next)
  assert.equal(next[0].id, first[0].id)
  assert.equal(state.isExpanded(next[0].id), true)
  assert.equal(state.isExpanded(next[1].id), false)
})
test('history insertion/splitting preserves open intent through stable members', () => {
  const state = new GroupState()
  const initial = groupWork([work('a'), work('b')])
  state.reconcile(initial)
  state.setExpanded(initial[0].id, true)
  const updated = groupWork([prose('late-left'), work('a'), prose('late-middle'), work('b')])
  state.reconcile(updated)
  assert.ok(updated.every(group => state.isExpanded(group.id)))
  state.reconcile([])
  assert.equal(state.isExpanded(updated[0].id), false)
})
test('different turns in the same incomplete window still have unique keys', () => {
  const groups = groupWork([work('a', 'tool', '1'), work('b', 'tool', '2'), work('c', 'tool', '1')])
  assert.equal(new Set(groups.map(group => group.id)).size, 3)
})
test('summary shows mixed completed actions, current operation and errors without body text', () => {
  const infos = [
    { kind: 'think', action: '已思考', status: 'done', detail: 'not copied into completed title' },
    { kind: 'context', action: '已注入上下文', status: 'done', detail: '' },
    { kind: 'tool', action: toolAction('bash'), status: 'running', detail: 'npm test' },
  ]
  assert.deepEqual(summarize(infos), { text: '已思考 · 已注入上下文 · 正在运行', detail: 'npm test', status: 'running', kind: 'tool' })
  assert.equal(summarize(infos.map(info => ({ ...info, status: 'done' }))).text, '已思考 · 已注入上下文 · 运行了命令')
  assert.equal(summarize([{ ...infos[2], status: 'error' }]).status, 'error')
  assert.equal(summarize([{ ...infos[2], status: 'waiting' }]).text, '等待操作')
})
test('latest running work determines the live detail without changing grouping', () => {
  const summary = summarize([
    { kind: 'tool', action: '运行了命令', status: 'running', detail: 'first' },
    { kind: 'tool', action: '运行了命令', status: 'running', detail: 'last' },
  ])
  assert.equal(summary.detail, 'last')
})

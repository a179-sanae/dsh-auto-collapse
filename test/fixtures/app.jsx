// React integration fixture for the observed DSH 0.1.2-rc.1 DOM contract.
// Native disclosure bodies are lazy mounted; hidden uses the host's until-found lifecycle.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { NativeDisclosureRow, NativeReasoningRow, NativeTurnProcess, useSearchableHidden } from './native.jsx'

let plugin
window.__ModuleLoader__ = { load(spec) { plugin = spec.factory(id => { if (id === 'react') return React; throw new Error(`Unexpected dependency: ${id}`) }) } }

const demo = () => ({
  nativeTurns: { '1': { enabled: true, open: true } },
  nodes: [
    { id: 'u1', kind: 'user', text: '检查项目并整理修改方案', turn: '1' },
    { id: 'n1', kind: 'turn-process', turn: '1' },
    { id: 'a1', kind: 'assistant-step', turn: '1', member: true, blocks: [{ kind: 'text', text: '我会先检查实现与宿主的交互，再整理需要修改的部分。' }] },
    { id: 'ctx1', kind: 'context', turn: '1', member: true, summary: '项目约定', text: '这里是完整的上下文注入内容。' },
    { id: 'think1', kind: 'assistant-step', turn: '1', member: true, blocks: [{ kind: 'think', text: '检查分组边界\n推理全文中的后续内容应由原生组件展示。' }] },
    { id: 'tool1', kind: 'tool-call', turn: '1', member: true, tool: 'browser', summary: '查看宿主的原生折叠', text: '浏览器工具的完整结果。' },
    { id: 'tool2', kind: 'tool-call', turn: '1', member: true, tool: 'edit', summary: 'src/work-groups.ts', text: '文件编辑结果。' },
    { id: 'a2', kind: 'assistant-step', turn: '1', member: true, blocks: [{ kind: 'text', text: '分组边界已经明确：正文之间的思考、工具和上下文合成一个工作段。' }] },
    { id: 'tool3', kind: 'tool-call', turn: '1', member: true, tool: 'bash', state: 'running', summary: 'npm run check', text: '正在运行验证。' },
    { id: 'a3', kind: 'assistant-step', turn: '1', blocks: [{ kind: 'text', text: '最终回答保持原生展示。二级展开后，仍可以逐条查看完整工作内容。' }] },
    { id: 'tail', kind: 'turn-tail', turn: '1', text: '回合信息' },
  ],
})
let current = { ...demo(), session: 1 }
const listeners = new Set()
const notify = () => { for (const listener of listeners) listener() }
function publish(next) { current = next; flushSync(notify) }
const useModel = () => React.useSyncExternalStore(React.useCallback(listener => { listeners.add(listener); return () => listeners.delete(listener) }, []), () => current)
function setNative(turn, open) { publish({ ...current, nativeTurns: { ...current.nativeTurns, [turn]: { ...current.nativeTurns[turn], open } } }) }

function translate(key, values = {}) {
  if (key === 'message.think') return 'Think'
  if (key === 'row.running') return '运行中'
  if (key.endsWith('.separator')) return ' · '
  if (key.endsWith('.thoughtForAWhile')) return '已思考'
  if (key.includes('.toolCalls.')) return `${values.count} 次工具调用`
  if (key.includes('.messages.')) return `${values.count} 条消息`
  if (key.includes('.subagents.')) return `${values.count} 个 subagent`
  return key
}

function Disclosure({ title, summary, children, initialOpen = false, keepSummary = false }) {
  const [open, setOpen] = React.useState(initialOpen)
  return <NativeDisclosureRow icon={<span aria-hidden="true">›</span>} title={title} open={open} expandable expandOnRowClick
    onToggle={() => setOpen(value => !value)} keepContentWhenOpen={keepSummary}
    collapsedContent={<><span aria-hidden="true"> · </span><span className="native-summary">{summary}</span></>}>
    <div className="native-detail">{children}</div>
  </NativeDisclosureRow>
}

function Think({ block }) {
  const text = block.text ?? ''
  const running = block.state === 'running'
  return <NativeReasoningRow text={text} running={running} t={translate} />
}

function ProcessReasoning({ hidden, turn, children }) {
  const reveal = React.useCallback(() => setNative(turn, true), [turn])
  return <div ref={useSearchableHidden(hidden, reveal)} data-turn-process-inline={hidden || undefined}>{children}</div>
}

const Seat = React.memo(function Seat({ node, native }) {
  const turn = node.turn ?? null
  const enabled = native?.enabled === true
  const hidden = node.kind === 'turn-process' ? !enabled : enabled && node.member === true && native.open === false
  const reveal = React.useCallback(() => { if (turn !== null) setNative(turn, true) }, [turn])
  const ref = useSearchableHidden(hidden, reveal)
  let contents
  if (node.kind === 'turn-process') contents = <NativeTurnProcess node={{ data: {
    turn,
    toolCallCount: current.nodes.filter(item => item.turn === turn && item.kind === 'tool-call').length,
    messageCount: Math.max(0, current.nodes.filter(item => item.turn === turn && item.blocks?.some(block => block.kind === 'text')).length - 1),
    subagentCount: 0,
  } }}
    turnProcess={{ foldable: enabled, open: native?.open === true, setOpen: open => setNative(turn, open) }} t={translate} />
  else if (node.kind === 'assistant-step') contents = <div className="assistant-root" data-streaming={node.streaming || undefined}>
    <div className="assistant-body">{(node.blocks ?? []).map((block, index) => block.kind === 'think'
      ? <ProcessReasoning key={block.id ?? index} turn={turn} hidden={enabled && node.inline === true && native.open === false}><Think block={block} /></ProcessReasoning>
      : <div className="prose" key={block.id ?? index} data-prose-id={block.id ?? `${node.id}-${index}`}>
          {block.kind === 'svg' ? <div className="diagram"><svg width="200" height="70"><rect width="200" height="70" fill="#4d6bfe" /><text x="15" y="40" fill="white">SVG ANSWER</text></svg></div>
          : block.kind === 'painted' ? <div className="painted" />
          : block.kind === 'image' ? <img alt="回答图片" width="100" height="60" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect width='100' height='60' fill='teal'/%3E%3C/svg%3E" />
          : (block.text ?? '').split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        </div>)}</div>
  </div>
  else if (node.kind === 'tool-call') contents = <div data-chat-call-id={node.callId ?? node.id} data-selected={node.selected || undefined}>
    <div data-tool={node.tool ?? 'bash'} data-state={node.state ?? 'ok'}>
      <Disclosure title={node.tool ?? 'Bash'} summary={node.summary} initialOpen={node.initialOpen} keepSummary>
        <pre>{node.text ?? 'Native tool result'}</pre>
        {node.input && <input aria-label="工具要求的输入" />}
        {node.nested && <div data-subcalls="true"><div data-chat-call-id="nested"><div data-tool="read" data-state="ok"><Disclosure title="Read" summary="nested call">nested result</Disclosure></div></div></div>}
      </Disclosure>
    </div>
  </div>
  else if (node.kind === 'context') contents = <Disclosure title="上下文注入" summary={node.summary} initialOpen={node.initialOpen}>
    <div data-context-injection-body="true" data-context-form="markdown">{node.text}</div>
  </Disclosure>
  else if (node.kind === 'command' || node.kind === 'manual-compaction') contents = <div data-variant="others" data-state={node.state ?? 'ok'}>
    <Disclosure title={node.kind} summary={node.summary}>{node.text}</Disclosure>
  </div>
  else contents = node.text ?? ''
  return <div ref={ref} className="flow-item" data-chat-flow-key={node.id} data-chat-anchor-key={node.id} data-chat-flow-kind={node.kind}
    data-chat-turn={turn ?? undefined} data-turn-process-member={node.member && enabled || undefined} data-turn-process-hidden={hidden || undefined}>
    {contents}
  </div>
})

let card = null
let scope = null
function App() {
  const model = useModel()
  const Card = card
  return <>
    <div className="fixture-controls">
      <button onClick={() => window.fixture.install()}>启动插件</button>
      <button onClick={() => window.fixture.stop()}>卸载插件</button>
      <button onClick={() => window.fixture.complete()}>完成工作</button>
    </div>
    <div data-conversation-scroll="true" className="scroller" key={model.session}>
      <div data-chat-flow="" className="flow">
        {model.nodes.map(node => <Seat key={`${node.id}:${node.renderKey ?? ''}`} node={node} native={model.nativeTurns?.[node.turn]} />)}
        {model.status !== undefined && <div role="status">{model.status}</div>}
      </div>
    </div>
    {Card && scope && <ul className="settings"><Card scope={scope} /></ul>}
  </>
}
const root = createRoot(document.getElementById('root'))
flushSync(() => root.render(<App />))
let cleanups = []
let injections = []
let serviceCleanups = []
let finishSave
function stopServices() { for (const off of serviceCleanups.splice(0).reverse()) off(); card = null; scope = null; publish({ ...current }) }
window.fixture = {
  load(model) {
    publish({ nativeTurns: {}, ...model, session: current.session + 1 })
  },
  patch(id, fields) { publish({ ...current, nodes: current.nodes.map(node => node.id === id ? { ...node, ...fields } : node) }) },
  append(nodes) { publish({ ...current, nodes: [...current.nodes, ...nodes] }) },
  replaceNodes(nodes) { publish({ ...current, nodes }) },
  setNative(turn, values) { publish({ ...current, nativeTurns: { ...current.nativeTurns, [turn]: { ...current.nativeTurns?.[turn], ...values } } }) },
  status(value) { publish({ ...current, status: value }) },
  complete() { publish({ ...current, nodes: current.nodes.map(node => node.state === 'running' ? { ...node, state: 'ok' } : node) }) },
  install() {
    this.stop()
    plugin.apply({
      effect(fn) { const off = fn(); if (typeof off === 'function') cleanups.push(off) },
      inject(names, setup) { injections.push({ names, setup }) },
    })
  },
  stop() { stopServices(); for (const off of cleanups.splice(0).reverse()) off(); injections = [] },
  diagnostics() { return document.__dshAutoCollapseV2?.diagnostics() },
  settings(value = 'Deep sleeping...', writable = true) {
    stopServices()
    let snapshot = { status: 'ready', value: { statusText: value }, base: { statusText: 'Deep sleeping...' }, user: { statusText: value }, writable }
    const subscribers = new Set()
    scope = {
      getSnapshot: () => snapshot,
      subscribe(listener) { subscribers.add(listener); return () => subscribers.delete(listener) },
      set(field, next) { return new Promise(resolve => { finishSave = () => { snapshot = { ...snapshot, value: { statusText: next } }; for (const listener of subscribers) listener(); resolve() } }) },
      unset() { return this.set('statusText', 'Deep sleeping...') },
    }
    const services = {
      settingsScope: { bind() { return scope } },
      slots: {
        inject(_key, fn) { fn(); return () => { card = null; publish({ ...current }) } },
        register(_options, renderer) { card = renderer },
      },
    }
    for (const injection of injections) injection.setup({ get(name) { return services[name] }, effect(fn) { const off = fn(); if (typeof off === 'function') serviceCleanups.push(off) } })
    publish({ ...current })
  },
  disconnectSettings() { stopServices() },
  resolveSave() { finishSave?.(); finishSave = undefined },
}

import { pluginOwned, seatKey } from './host-contract.js'
import type { FlowToken, WorkKind } from './work-groups.js'

export interface WorkItem {
  id: string
  turn: string | null
  kind: WorkKind
  seat: HTMLElement
  row: HTMLElement
  /** Largest ancestor proved to contain only work, never a prose ancestor. */
  cover: HTMLElement
}

interface SeatSnapshot { tokens: FlowToken[]; items: WorkItem[] }
export interface WorkSnapshot { tokens: FlowToken[]; items: Map<string, WorkItem> }

const ASSISTANT_KINDS = new Set(['assistant-step', 'assistant'])
const COMMAND_KINDS = new Set(['command', 'manual-compaction'])

function readSeat(seat: HTMLElement, fallback: string): SeatSnapshot {
  const kind = seat.getAttribute('data-chat-flow-kind')
  const key = seatKey(seat)
  const turn = seat.getAttribute('data-chat-turn') || null
  const result: SeatSnapshot = { tokens: [], items: [] }
  if (kind === 'turn-process') return result
  if (key === null || kind === null) {
    result.tokens.push({ type: 'boundary', id: `unknown:${key ?? fallback}`, turn: null, hard: true })
    return result
  }
  const boundary = (id: string, hard: boolean): FlowToken => ({ type: 'boundary', id: `${key}:${id}`, turn, hard })
  const add = (row: HTMLElement, workKind: WorkKind, suffix: string): WorkItem => {
    const item: WorkItem = { id: JSON.stringify([key, workKind, suffix]), turn, kind: workKind, seat, row, cover: row }
    result.items.push(item)
    return item
  }
  const token = (item: WorkItem): FlowToken => ({ type: 'work', id: item.id, turn, kind: item.kind })

  if (kind === 'context' || COMMAND_KINDS.has(kind)) {
    // An empty command skeleton has no content to hide and no usable summary yet.
    if (seat.childNodes.length === 0) return result
    const item = add(seat, kind === 'context' ? 'context' : 'command', '')
    result.tokens.push(token(item))
    return result
  }
  if (!ASSISTANT_KINDS.has(kind) && kind !== 'tool-call') {
    result.tokens.push(boundary('fence', true))
    return result
  }

  const roots = new Map<HTMLElement, WorkItem>()
  const paths = new Set<Element>([seat])
  const candidates = [...seat.querySelectorAll<HTMLElement>('[data-chat-call-id], [data-variant="think"]')]
  let thinkIndex = 0
  for (const row of candidates) {
    if (pluginOwned(row) || row.closest('[data-subcalls]') !== null) continue
    const outerCall = row.parentElement?.closest('[data-chat-call-id]')
    if (outerCall !== null && outerCall !== undefined && seat.contains(outerCall)) continue
    const isTool = row.hasAttribute('data-chat-call-id')
    if (!isTool && row.hasAttribute('data-tool')) continue
    // Require an actual host disclosure before taking control; unknown renderers stay visible.
    if (row.querySelector('[data-disclosure-row]') === null) continue
    const item = add(row, isTool ? 'tool' : 'think', isTool ? row.getAttribute('data-chat-call-id')! : String(thinkIndex++))
    roots.set(row, item)
    for (let parent = row.parentElement; parent !== null && seat.contains(parent); parent = parent.parentElement) paths.add(parent)
  }

  let bodyIndex = 0
  const visit = (node: Node): FlowToken[] => {
    if (pluginOwned(node) || node.nodeType === 8) return []
    if (node.nodeType === 3) return (node.textContent ?? '').trim() === '' ? [] : [boundary(`body:${bodyIndex++}`, false)]
    if (!(node instanceof Element)) return []
    if (node.matches('script, style, template')) return []
    const work = roots.get(node as HTMLElement)
    if (work !== undefined) return [token(work)]
    if (!paths.has(node)) {
      // Opaque prose/media remains untouched, including SVG and CSS-painted empty elements.
      return [boundary(`body:${bodyIndex++}`, false)]
    }
    const children = [...node.childNodes].flatMap(visit)
    if (children.length > 0 && children.every(child => child.type === 'work') && node instanceof HTMLElement) {
      const ids = new Set(children.map(child => child.id))
      for (const item of result.items) if (ids.has(item.id)) item.cover = node
    }
    return children
  }
  result.tokens = visit(seat)
  return result
}

/** Cache structure per host seat. Text inside a work row does not invalidate this index. */
export class WorkModel {
  private seats = new Map<HTMLElement, SeatSnapshot>()
  private identities = new WeakMap<HTMLElement, string>()
  private sequence = 0

  read(flow: HTMLElement, dirty: ReadonlySet<HTMLElement>, force = false): WorkSnapshot {
    const live = new Set<HTMLElement>()
    const tokens: FlowToken[] = []
    const items = new Map<string, WorkItem>()
    for (const child of flow.children) {
      if (!(child instanceof HTMLElement) || pluginOwned(child)) continue
      if (!child.hasAttribute('data-chat-flow-kind')) {
        // Native loading/status controls are not transcript nodes. Never touch their contents.
        continue
      }
      live.add(child)
      let snapshot = this.seats.get(child)
      if (force || snapshot === undefined || dirty.has(child)) {
        let identity = this.identities.get(child)
        if (identity === undefined) { identity = String(++this.sequence); this.identities.set(child, identity) }
        snapshot = readSeat(child, identity)
        this.seats.set(child, snapshot)
      }
      tokens.push(...snapshot.tokens)
      for (const item of snapshot.items) items.set(item.id, item)
    }
    for (const seat of this.seats.keys()) if (!live.has(seat)) this.seats.delete(seat)
    return { tokens, items }
  }

  clear(): void { this.seats.clear() }
}

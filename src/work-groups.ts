/** DOM-independent, ordered work grouping. Prose and turn changes are boundaries. */
export type WorkKind = 'think' | 'tool' | 'context' | 'command'

export type FlowToken =
  | { type: 'work'; id: string; turn: string | null; kind: WorkKind }
  | { type: 'boundary'; id: string; turn: string | null; hard: boolean }

export interface WorkGroup {
  id: string
  turn: string | null
  items: readonly string[]
}

/** Unscoped context can inherit an unambiguous adjacent turn, never across a user fence. */
export function resolveTurns(tokens: readonly FlowToken[]): FlowToken[] {
  const nextTurns: (string | null)[] = new Array(tokens.length).fill(null)
  let next: string | null = null
  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i]
    if (token.type === 'boundary' && token.hard) next = null
    nextTurns[i] = next
    if (!(token.type === 'boundary' && token.hard) && token.turn !== null) next = token.turn
  }
  let previous: string | null = null
  return tokens.map((token, i) => {
    if (token.type === 'boundary' && token.hard) { previous = null; return token }
    if (token.turn !== null) { previous = token.turn; return token }
    if (token.type !== 'work') return token
    const following = nextTurns[i]
    const turn = previous === null ? following : following === null || previous === following ? previous : null
    return { ...token, turn }
  })
}

export function groupWork(tokens: readonly FlowToken[]): WorkGroup[] {
  const groups: WorkGroup[] = []
  let left = 'start'
  let current: { id: string; turn: string | null; items: string[] } | null = null
  let lastItem = ''
  for (const token of resolveTurns(tokens)) {
    if (token.type === 'boundary') {
      left = token.id
      current = null
      continue
    }
    if (current !== null && current.turn !== token.turn) {
      left = `turn-after:${lastItem}`
      current = null
    }
    if (current === null) {
      current = { id: JSON.stringify([left, token.turn]), turn: token.turn, items: [] }
      groups.push(current)
    }
    current.items.push(token.id)
    lastItem = token.id
  }
  return groups
}

/** Expansion belongs to a work interval, not its current running item or DOM node. */
export class GroupState {
  private groups = new Map<string, WorkGroup>()
  private expanded = new Map<string, boolean>()

  reconcile(groups: readonly WorkGroup[]): void {
    const previousItems = new Map<string, boolean>()
    for (const group of this.groups.values()) {
      for (const id of group.items) previousItems.set(id, this.isExpanded(group.id))
    }
    const next = new Map<string, boolean>()
    for (const group of groups) {
      // If history insertion/splitting changes the left boundary, preserve explicit open intent.
      next.set(group.id, this.expanded.get(group.id) ?? group.items.some(id => previousItems.get(id) === true))
    }
    this.groups = new Map(groups.map(group => [group.id, group]))
    this.expanded = next
  }

  isExpanded(id: string): boolean { return this.expanded.get(id) ?? false }
  setExpanded(id: string, value: boolean): void { if (this.groups.has(id)) this.expanded.set(id, value) }
  clear(): void { this.groups.clear(); this.expanded.clear() }
}

/** DSH 0.1.2 DOM contract. Keep host recognition separate from grouping and rendering. */
export const FLOW = '[data-chat-flow]'
export const SEAT = '[data-chat-flow-kind]'
export const OWNED = '[data-dshcf-group]'
export const FOLDED = 'data-dshcf-folded'
export const NATIVE_HIDDEN = '[data-turn-process-hidden], [data-turn-process-inline]'

export function elementOf(node: Node): Element | null {
  return node.nodeType === 1 ? node as Element : node.parentElement
}

export function pluginOwned(node: Node): boolean { return elementOf(node)?.closest(OWNED) != null }

export function seatOf(node: Node, flow: HTMLElement): HTMLElement | null {
  let element = elementOf(node)
  while (element !== null && element.parentElement !== flow) element = element.parentElement
  return element instanceof HTMLElement && element.matches(SEAT) ? element : null
}

export function seatKey(seat: HTMLElement): string | null {
  return seat.getAttribute('data-chat-flow-key') ?? seat.getAttribute('data-chat-anchor-key')
}

export function nativeHidden(row: HTMLElement, flow: HTMLElement): boolean {
  const owner = row.closest(NATIVE_HIDDEN)
  return owner !== null && flow.contains(owner)
}

export function nativeOwnsHidden(element: HTMLElement): boolean { return element.matches(NATIVE_HIDDEN) }

export function findFlow(): HTMLElement | null {
  for (const flow of document.querySelectorAll<HTMLElement>(FLOW)) {
    if (flow.getClientRects().length > 0 && getComputedStyle(flow).visibility !== 'hidden') return flow
  }
  return null
}

export function nativeControls(flow: HTMLElement): Map<string, HTMLButtonElement> {
  const result = new Map<string, HTMLButtonElement>()
  for (const button of flow.querySelectorAll<HTMLButtonElement>('button[data-turn-process]')) {
    const turn = button.getAttribute('data-turn-process')
    if (turn !== null && button.closest('[data-chat-flow-kind="turn-process"]') !== null) result.set(turn, button)
  }
  return result
}

export function nativeCollapsed(button: HTMLButtonElement | undefined): boolean {
  if (button === undefined || !button.isConnected) return false
  const expanded = button.getAttribute('aria-expanded')
  return expanded === 'false' || (expanded === null && !button.hasAttribute('data-open'))
}

export function openNative(button: HTMLButtonElement | undefined): void {
  if (button !== undefined && nativeCollapsed(button)) {
    const focused = button.ownerDocument.activeElement
    button.click()
    // Native clicks focus the turn button. A selection/search reveal must not steal typing focus.
    if (focused instanceof HTMLElement && focused.isConnected && focused !== button) {
      focused.focus({ preventScroll: true })
      if (focused === button.ownerDocument.body && button.ownerDocument.activeElement === button) button.blur()
    }
  }
}

export const OBSERVED_ATTRIBUTES = [
  'data-chat-flow-key', 'data-chat-anchor-key', 'data-chat-flow-kind', 'data-chat-turn',
  'data-variant', 'data-tool', 'data-state', 'data-selected', 'data-open', 'data-expanded', 'aria-expanded',
  'data-turn-process-member', 'data-turn-process-hidden', 'data-turn-process-inline',
  'hidden', 'style', 'class',
]

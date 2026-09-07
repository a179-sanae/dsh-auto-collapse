import css from './styles.css'
import { FOLDED, nativeHidden, nativeOwnsHidden } from './host-contract.js'
import type { WorkItem } from './work-model.js'
import type { GroupSummary } from './summary.js'

interface Lease { hidden: string | null; marker: string | null; group: string }
interface GroupRow { button: HTMLButtonElement; label: HTMLElement; detail: HTMLElement; targets: Set<HTMLElement> }
export interface PreparedGroup { id: string; expanded: boolean; summary: GroupSummary; anchor?: HTMLElement; desired: Set<HTMLElement> }

/** Own only group overlays and reversible hidden attributes, never native content or inline styles. */
export class GroupView {
  private readonly owner = `v2-${Math.random().toString(36).slice(2)}`
  private readonly rows = new Map<string, GroupRow>()
  private readonly leases = new Map<HTMLElement, Lease>()
  private readonly writes = new Map<HTMLElement, string | null>()
  private readonly displays = new Map<HTMLElement, string>()
  private readonly style = document.createElement('style')

  constructor(private readonly flow: HTMLElement, private readonly toggle: (id: string) => void) {
    this.style.id = 'dshcf-v2-style'
    this.style.textContent = css
    document.head.append(this.style)
  }

  private writeHidden(element: HTMLElement, value: string | null): void {
    if (element.getAttribute('hidden') === value) return
    this.writes.set(element, value)
    if (value === null) element.removeAttribute('hidden')
    else element.setAttribute('hidden', value)
  }

  ownMutation(record: MutationRecord): boolean {
    return record.type === 'attributes' && record.attributeName === 'hidden'
      && record.target instanceof HTMLElement && this.writes.has(record.target)
      && this.writes.get(record.target) === record.target.getAttribute('hidden')
  }

  clearWrites(): void { this.writes.clear() }

  detachedGroups(nodes: readonly Node[]): string[] {
    return nodes.flatMap(node => {
      if (!(node instanceof HTMLElement) || node.isConnected) return []
      const id = node.getAttribute('data-dshcf-group')
      return id !== null && this.rows.get(id)?.button === node ? [id] : []
    })
  }

  beginRead(): void { this.displays.clear() }

  private fold(element: HTMLElement, group: string): void {
    if (nativeOwnsHidden(element)) { this.release(element); return }
    const existing = this.leases.get(element)
    if (existing === undefined) {
      if (element.hasAttribute('hidden')) return
      this.leases.set(element, { hidden: null, marker: element.getAttribute(FOLDED), group })
      element.setAttribute(FOLDED, this.owner)
    } else if (element.getAttribute(FOLDED) !== this.owner) {
      this.leases.delete(element)
      return
    }
    this.writeHidden(element, 'until-found')
  }

  private release(element: HTMLElement): void {
    const lease = this.leases.get(element)
    if (lease === undefined) return
    this.leases.delete(element)
    if (element.getAttribute(FOLDED) !== this.owner) return
    if (!nativeOwnsHidden(element) && element.getAttribute('hidden') === 'until-found') this.writeHidden(element, lease.hidden)
    if (lease.marker === null) element.removeAttribute(FOLDED)
    else element.setAttribute(FOLDED, lease.marker)
  }

  private externallyHidden(item: WorkItem): boolean {
    for (let element: HTMLElement | null = item.row; element !== null && element !== this.flow; element = element.parentElement) {
      let display = this.displays.get(element)
      if (display === undefined) { display = getComputedStyle(element).display; this.displays.set(element, display) }
      if (display === 'none') return true
      if (element.hasAttribute('hidden') && !this.leases.has(element)) return true
    }
    return false
  }

  private create(id: string): GroupRow {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'dshcf-group'
    button.setAttribute('data-dshcf-group', id)
    const icon = document.createElement('span')
    icon.className = 'dshcf-group-icon'
    icon.setAttribute('aria-hidden', 'true')
    // A small workflow glyph; no global native-icon searches or message cloning.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 16 16')
    svg.setAttribute('fill', 'none')
    const path = document.createElementNS(svg.namespaceURI, 'path')
    path.setAttribute('d', 'M3 3.5h10M3 8h10M3 12.5h10M1 3.5h.1M1 8h.1M1 12.5h.1')
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.3')
    path.setAttribute('stroke-linecap', 'round')
    svg.append(path)
    icon.append(svg)
    const label = document.createElement('span')
    label.className = 'dshcf-group-label'
    const detail = document.createElement('span')
    detail.className = 'dshcf-group-detail'
    const chevron = document.createElementNS(svg.namespaceURI, 'svg')
    chevron.setAttribute('class', 'dshcf-group-chevron')
    chevron.setAttribute('viewBox', '0 0 12 12')
    chevron.setAttribute('aria-hidden', 'true')
    const arrow = document.createElementNS(svg.namespaceURI, 'path')
    arrow.setAttribute('d', 'm3 4.5 3 3 3-3')
    arrow.setAttribute('fill', 'none')
    arrow.setAttribute('stroke', 'currentColor')
    chevron.append(arrow)
    button.append(icon, label, detail, chevron)
    button.addEventListener('click', () => { if (this.rows.get(id)?.button === button) this.toggle(id) })
    const row: GroupRow = { button, label, detail, targets: new Set() }
    this.rows.set(id, row)
    return row
  }

  summarize(id: string, summary: GroupSummary, expanded: boolean): void {
    const row = this.rows.get(id)
    if (row === undefined) return
    if (row.label.textContent !== summary.text) row.label.textContent = summary.text
    const detail = expanded ? '' : summary.detail
    if (row.detail.textContent !== detail) row.detail.textContent = detail
    const attributes = {
      'aria-expanded': String(expanded),
      'aria-label': `${expanded ? '收起' : '展开'}工作过程：${summary.text}${detail ? ` · ${detail}` : ''}`,
      'data-status': summary.status,
      title: `${summary.text}${detail ? ` · ${detail}` : ''}`,
    }
    for (const [name, value] of Object.entries(attributes)) if (row.button.getAttribute(name) !== value) row.button.setAttribute(name, value)
  }

  prepare(id: string, items: readonly WorkItem[], expanded: boolean, summary: GroupSummary): PreparedGroup {
    const available = items.filter(item => item.row.isConnected && !nativeHidden(item.row, this.flow) && !this.externallyHidden(item))
    const anchor = available[0]?.cover
    return { id, expanded, summary, anchor, desired: new Set(expanded ? [] : available.map(item => item.cover)) }
  }

  apply({ id, expanded, summary, anchor, desired }: PreparedGroup): void {
    const row = this.rows.get(id) ?? this.create(id)
    row.button.hidden = anchor === undefined
    if (anchor !== undefined && (row.button.parentNode !== anchor.parentNode || row.button.nextSibling !== anchor)) {
      const focused = document.activeElement === row.button
      anchor.before(row.button)
      if (focused) row.button.focus({ preventScroll: true })
    }
    for (const target of row.targets) if (!desired.has(target)) this.release(target)
    for (const target of desired) this.fold(target, id)
    row.targets = desired
    this.summarize(id, summary, expanded)
  }

  focus(id: string): void { this.rows.get(id)?.button.focus({ preventScroll: true }) }

  remove(id: string): void {
    const row = this.rows.get(id)
    if (row === undefined) return
    for (const target of row.targets) this.release(target)
    row.button.remove()
    this.rows.delete(id)
  }

  dispose(): void {
    for (const id of [...this.rows.keys()]) this.remove(id)
    for (const target of [...this.leases.keys()]) this.release(target)
    this.style.remove()
    this.writes.clear()
    this.displays.clear()
  }
}

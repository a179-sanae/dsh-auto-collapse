import { elementOf, findFlow, nativeControls, OBSERVED_ATTRIBUTES, openNative, pluginOwned, seatOf } from './host-contract.js'
import { WorkModel, type WorkItem } from './work-model.js'
import { groupWork, GroupState, type WorkGroup } from './work-groups.js'
import { needsAttention, readWorkInfo } from './work-info.js'
import { summarize, type WorkInfo } from './summary.js'
import { GroupView, type PreparedGroup } from './dom-view.js'
import { Scheduler } from './scheduler.js'
import { StatusTextController } from './status-text.js'

type OwnedDocument = Document & { __dshAutoCollapseV2?: FoldController }
const STRUCTURAL_ATTRIBUTES = new Set(['data-chat-flow-key', 'data-chat-anchor-key', 'data-chat-flow-kind', 'data-chat-turn', 'data-variant', 'data-tool'])

/** Native L1 owns turns; this controller owns only mixed-work L2 groups. */
export class FoldController {
  private flow: HTMLElement | null = null
  private observer: MutationObserver | null = null
  private view: GroupView | null = null
  private readonly model = new WorkModel()
  private readonly state = new GroupState()
  private readonly scheduler = new Scheduler(() => this.flush())
  private readonly status: StatusTextController | null
  private items = new Map<string, WorkItem>()
  private groups = new Map<string, WorkGroup>()
  private infos = new Map<string, WorkInfo>()
  private itemGroups = new Map<string, string>()
  private rowItems = new WeakMap<Element, string>()
  private seatGroups = new Map<HTMLElement, Set<string>>()
  private turnGroups = new Map<string, Set<string>>()
  private controls = new Map<string, HTMLButtonElement>()
  private readonly dirtySeats = new Set<HTMLElement>()
  private readonly dirtyItems = new Set<string>()
  private readonly dirtyGroups = new Set<string>()
  private modelDirty = true
  private discover = true
  private force = true
  private started = false
  private disposed = false
  private lastError = ''
  private readonly stats = { passes: 0, structures: 0, groupUpdates: 0, infoUpdates: 0, lastDurationMs: 0 }
  private readonly ready = () => this.start()
  private readonly visible = () => { if (!document.hidden) { this.discover = true; this.refresh() } }
  private readonly reveal = (event: Event) => this.revealAt(event.target as Node, event.type === 'beforematch')

  constructor(statusText?: () => string | undefined) {
    this.status = statusText === undefined ? null : new StatusTextController(statusText)
  }

  start(): void {
    if (this.started || this.disposed || typeof document === 'undefined') return
    if (document.body === null) { document.addEventListener('DOMContentLoaded', this.ready, { once: true }); return }
    const owner = document as OwnedDocument
    if (owner.__dshAutoCollapseV2 !== this) owner.__dshAutoCollapseV2?.stop()
    owner.__dshAutoCollapseV2 = this
    document.removeEventListener('DOMContentLoaded', this.ready)
    this.started = true
    this.observer = new MutationObserver(records => this.mutations(records))
    this.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: OBSERVED_ATTRIBUTES })
    document.addEventListener('visibilitychange', this.visible)
    this.scheduler.schedule()
  }

  refresh(): void {
    if (this.disposed) return
    this.force = this.modelDirty = true
    this.status?.refresh()
    this.scheduler.schedule()
  }

  refreshStatus(): void { if (!this.disposed) this.status?.refresh() }

  /** Small diagnostics for regressions/performance, never rendered into the chat. */
  diagnostics(): Readonly<typeof this.stats> & { groups: number; items: number } {
    return { ...this.stats, groups: this.groups.size, items: this.items.size }
  }

  private itemAt(node: Node): string | undefined {
    for (let element = elementOf(node); element !== null && element !== this.flow; element = element.parentElement) {
      const id = this.rowItems.get(element)
      if (id !== undefined) return id
    }
    return undefined
  }

  private dirtySeatGroups(seat: HTMLElement | null): void {
    if (seat === null) return
    for (const id of this.seatGroups.get(seat) ?? []) this.dirtyGroups.add(id)
    if (seat.getAttribute('data-chat-flow-kind') === 'turn-process') {
      const turn = seat.getAttribute('data-chat-turn')
      if (turn !== null) for (const id of this.turnGroups.get(turn) ?? []) this.dirtyGroups.add(id)
    }
  }

  private mutations(records: MutationRecord[]): void {
    if (this.disposed) return
    let relevant = false
    for (const record of records) {
      if (pluginOwned(record.target) || this.view?.ownMutation(record)) continue
      const changed = [...record.addedNodes, ...record.removedNodes]
      for (const id of this.view?.detachedGroups(changed) ?? []) { this.dirtyGroups.add(id); relevant = true }
      if (record.type === 'childList' && changed.length > 0 && changed.every(pluginOwned)) continue
      const flow = this.flow
      if (flow === null || !flow.isConnected) {
        this.discover = relevant = true
        continue
      }
      if (!flow.contains(record.target)) {
        if (record.type === 'attributes' && record.target instanceof Element && record.target.contains(flow)) {
          this.discover = this.force = this.modelDirty = relevant = true
        }
        if (record.type === 'childList' && changed.some(node => node instanceof Element && (node.matches('[data-chat-flow]') || node.querySelector('[data-chat-flow]') !== null))) this.discover = relevant = true
        continue
      }
      const seat = seatOf(record.target, flow)
      if (seat === null && record.target !== flow) continue
      relevant = true
      const item = this.itemAt(record.target)
      if (record.type === 'attributes' && STRUCTURAL_ATTRIBUTES.has(record.attributeName ?? '')) {
        this.modelDirty = true
        if (seat !== null) this.dirtySeats.add(seat)
      } else if (item !== undefined) {
        this.dirtyItems.add(item)
        if (record.type === 'attributes') this.dirtySeatGroups(seat)
      } else if (record.type === 'attributes') {
        this.dirtySeatGroups(seat)
        if (seat === null) { this.force = this.modelDirty = true; this.discover = true }
      } else {
        this.modelDirty = true
        if (seat !== null) this.dirtySeats.add(seat)
        this.dirtySeatGroups(seat)
      }
    }
    this.view?.clearWrites()
    if (relevant) this.scheduler.schedule()
  }

  private switchFlow(flow: HTMLElement | null): void {
    if (flow === this.flow) return
    this.flow?.removeEventListener('beforematch', this.reveal, true)
    this.flow?.removeEventListener('focusin', this.reveal, true)
    this.view?.dispose()
    this.view = null
    this.model.clear()
    this.state.clear()
    this.items.clear()
    this.groups.clear()
    this.infos.clear()
    this.itemGroups.clear()
    this.seatGroups.clear()
    this.turnGroups.clear()
    this.controls.clear()
    this.rowItems = new WeakMap()
    this.dirtySeats.clear()
    this.dirtyItems.clear()
    this.dirtyGroups.clear()
    this.flow = flow
    this.force = this.modelDirty = true
    this.status?.setFlow(flow)
    if (flow !== null) {
      this.view = new GroupView(flow, id => this.toggle(id))
      flow.addEventListener('beforematch', this.reveal, true)
      flow.addEventListener('focusin', this.reveal, true)
    }
  }

  private rebuild(flow: HTMLElement): void {
    const previousItems = this.items
    const previousGroups = this.groups
    const snapshot = this.model.read(flow, this.dirtySeats, this.force)
    const groups = groupWork(snapshot.tokens)
    this.state.reconcile(groups)
    this.items = snapshot.items
    this.groups = new Map(groups.map(group => [group.id, group]))
    this.itemGroups.clear()
    this.seatGroups.clear()
    this.turnGroups.clear()
    this.rowItems = new WeakMap()
    this.controls = nativeControls(flow)
    for (const id of previousGroups.keys()) if (!this.groups.has(id)) this.view?.remove(id)
    for (const id of this.infos.keys()) if (!this.items.has(id)) this.infos.delete(id)
    for (const group of groups) {
      const previous = previousGroups.get(group.id)
      if (this.force || previous === undefined || previous.items.length !== group.items.length || previous.items.some((id, i) => id !== group.items[i])) this.dirtyGroups.add(group.id)
      if (group.turn !== null) {
        const siblings = this.turnGroups.get(group.turn) ?? new Set<string>()
        siblings.add(group.id)
        this.turnGroups.set(group.turn, siblings)
      }
      for (const id of group.items) {
        const item = this.items.get(id)!
        const previousItem = previousItems.get(id)
        if (previousItem !== item) {
          this.dirtyItems.add(id)
          this.dirtyGroups.add(group.id)
        }
        this.itemGroups.set(id, group.id)
        this.rowItems.set(item.row, id)
        const owners = this.seatGroups.get(item.seat) ?? new Set<string>()
        owners.add(group.id)
        this.seatGroups.set(item.seat, owners)
      }
    }
    this.dirtySeats.clear()
    this.force = this.modelDirty = false
    this.stats.structures++
  }

  private prepare(group: WorkGroup): PreparedGroup | undefined {
    const items = group.items.map(id => this.items.get(id)!).filter(Boolean)
    if (!this.state.isExpanded(group.id) && needsAttention(items, this.infos)) {
      this.state.setExpanded(group.id, true)
      if (group.turn !== null) openNative(this.controls.get(group.turn))
    }
    this.stats.groupUpdates++
    return this.view?.prepare(group.id, items, this.state.isExpanded(group.id), summarize(group.items.map(id => this.infos.get(id)!).filter(Boolean)))
  }

  private flush(): void {
    if (this.disposed) return
    const start = performance.now()
    this.stats.passes++
    try {
      if (this.discover || !this.flow?.isConnected) { this.discover = false; this.switchFlow(findFlow()) }
      const flow = this.flow
      if (flow === null) return
      if (this.modelDirty) this.rebuild(flow)
      this.view?.beginRead()
      const summaries = new Set<string>()
      for (const id of this.dirtyItems) {
        const item = this.items.get(id)
        if (item === undefined) continue
        this.infos.set(id, readWorkInfo(item))
        this.stats.infoUpdates++
        const group = this.itemGroups.get(id)
        if (group !== undefined) summaries.add(group)
      }
      const prepared: PreparedGroup[] = []
      for (const id of this.dirtyGroups) {
        const group = this.groups.get(id)
        if (group !== undefined) {
          const update = this.prepare(group)
          if (update !== undefined) prepared.push(update)
        }
        summaries.delete(id)
      }
      // Read all affected visibility first; batch writes to avoid layout/style thrashing on history loads.
      for (const update of prepared) this.view?.apply(update)
      for (const id of summaries) {
        const group = this.groups.get(id)
        if (group !== undefined) this.view?.summarize(id, summarize(group.items.map(item => this.infos.get(item)!).filter(Boolean)), this.state.isExpanded(id))
      }
      this.lastError = ''
    } catch (error) {
      // Fail visible, then allow a later host change to re-establish a clean index.
      this.observer?.disconnect()
      this.switchFlow(null)
      // Reconnect after cleanup so our restoration cannot trigger an endless error/retry loop.
      if (!this.disposed && document.body !== null) this.observer?.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: OBSERVED_ATTRIBUTES })
      const message = String(error)
      if (this.lastError !== message) console.error('[dsh-auto-collapse] restored native view after an error', error)
      this.lastError = message
    } finally {
      this.dirtyGroups.clear()
      this.dirtyItems.clear()
      this.stats.lastDurationMs = performance.now() - start
    }
  }

  private toggle(id: string): void {
    const group = this.groups.get(id)
    if (group === undefined || this.disposed) return
    const expanded = !this.state.isExpanded(id)
    this.state.setExpanded(id, expanded)
    if (expanded && group.turn !== null) { openNative(this.controls.get(group.turn)); this.view?.focus(id) }
    this.dirtyGroups.add(id)
    this.scheduler.schedule()
  }

  private revealAt(node: Node, search: boolean): void {
    if (this.flow === null || pluginOwned(node)) return
    const item = this.itemAt(node)
    const groups = item !== undefined ? [this.itemGroups.get(item)!] : [...(this.seatGroups.get(seatOf(node, this.flow)!) ?? [])]
    for (const id of groups) {
      const group = this.groups.get(id)
      if (group === undefined) continue
      if (!search && this.state.isExpanded(id)) continue
      this.state.setExpanded(id, true)
      if (group.turn !== null) openNative(this.controls.get(group.turn))
      this.dirtyGroups.add(id)
    }
    if (groups.length > 0) this.scheduler.schedule()
  }

  stop(): void {
    if (this.disposed) return
    this.disposed = true
    this.started = false
    this.observer?.disconnect()
    this.scheduler.dispose()
    if (typeof document !== 'undefined') {
      document.removeEventListener('DOMContentLoaded', this.ready)
      document.removeEventListener('visibilitychange', this.visible)
    }
    this.switchFlow(null)
    this.status?.dispose()
    if (typeof document !== 'undefined') {
      const owner = document as OwnedDocument
      if (owner.__dshAutoCollapseV2 === this) delete owner.__dshAutoCollapseV2
    }
  }
}

import { Scheduler } from './scheduler.js'

const COPY = /Deep diving[.…]*|深度求索中\s*[.…]*/
interface WrittenText { original: string; written: string }

/** Optional status copy is independent of work grouping and never reads message text. */
export class StatusTextController {
  private flow: HTMLElement | null = null
  private observer: MutationObserver | null = null
  private readonly texts = new Map<Text, WrittenText>()
  private readonly scheduler = new Scheduler(() => this.update())

  constructor(private readonly read: () => string | undefined) {}

  setFlow(flow: HTMLElement | null): void {
    if (flow === this.flow) return
    this.observer?.disconnect()
    this.restore()
    this.flow = flow
    if (flow === null) return
    this.observer = new MutationObserver(records => {
      if (records.some(record => {
        const element = record.target.nodeType === 1 ? record.target as Element : record.target.parentElement
        const status = element?.closest('[role="status"]')
        if (status?.closest('[data-chat-flow-kind]') != null) return false
        if (record.type === 'characterData' && record.target instanceof Text) {
          return status != null && this.texts.get(record.target)?.written !== record.target.data
        }
        return record.type === 'childList' && (status != null || [...record.addedNodes].some(node => node instanceof Element && (node.matches('[role="status"]') || node.querySelector('[role="status"]') !== null)))
      })) this.refresh()
    })
    this.observer.observe(flow, { subtree: true, childList: true, characterData: true })
    this.refresh()
  }

  refresh(): void { this.scheduler.schedule() }

  private update(): void {
    if (this.flow === null) return
    const replacement = this.read()
    if (replacement === '' || replacement === undefined) { this.restore(); return }
    for (const text of this.texts.keys()) if (!text.isConnected) this.texts.delete(text)
    for (const status of this.flow.querySelectorAll<HTMLElement>('[role="status"]')) {
      if (status.closest('[data-chat-flow-kind]') !== null) continue
      const walker = document.createTreeWalker(status, NodeFilter.SHOW_TEXT)
      let node: Node | null
      while ((node = walker.nextNode()) !== null) {
        const text = node as Text
        const previous = this.texts.get(text)
        const original = previous?.written === text.data ? previous.original : text.data
        if (!COPY.test(original)) continue
        const written = original.replace(COPY, () => replacement)
        this.texts.set(text, { original, written })
        if (text.data !== written) text.data = written
      }
    }
  }

  private restore(): void {
    for (const [text, record] of this.texts) if (text.data === record.written) text.data = record.original
    this.texts.clear()
  }

  dispose(): void { this.observer?.disconnect(); this.scheduler.dispose(); this.restore(); this.flow = null }
}

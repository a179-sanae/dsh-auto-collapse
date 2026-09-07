import type { WorkItem } from './work-model.js'
import { normalizeStatus, toolAction, type WorkInfo } from './summary.js'

/** Only read the native summary row. A collapsed disclosure does not contain its full body. */
function preview(row: HTMLElement): string {
  const follow = row.querySelector<HTMLElement>('[data-follow-end]')
  if (follow !== null) return (follow.textContent ?? '').trim().slice(-240)
  const disclosure = row.querySelector<HTMLElement>('[data-disclosure-row]')
  if (disclosure === null) return ''
  for (const child of [...disclosure.children].slice(2)) {
    if (child.getAttribute('aria-hidden') === 'true') continue
    const value = (child.textContent ?? '').trim()
    if (value !== '') return value.replace(/\s+/g, ' ').slice(0, 240)
  }
  return ''
}

export function readWorkInfo(item: WorkItem): WorkInfo {
  const root = item.kind === 'tool'
    ? item.row.querySelector<HTMLElement>('[data-tool]') ?? item.row
    : item.kind === 'command' ? item.row.querySelector<HTMLElement>('[data-state]') ?? item.row : item.row
  const action = item.kind === 'think' ? '已思考'
    : item.kind === 'context' ? '已注入上下文'
      : item.kind === 'command' ? '运行了命令' : toolAction((root.getAttribute('data-tool') ?? '').slice(0, 80))
  return { kind: item.kind, action, detail: preview(item.row), status: normalizeStatus(root.getAttribute('data-state')) }
}

export function needsAttention(items: readonly WorkItem[], infos: ReadonlyMap<string, WorkInfo>): boolean {
  return items.some(item =>
    item.cover.contains(document.activeElement)
    || item.row.hasAttribute('data-selected')
    || item.row.querySelector('[data-selected], input:not(:disabled), textarea:not(:disabled), select:not(:disabled)') !== null
    || infos.get(item.id)?.status === 'waiting',
  )
}

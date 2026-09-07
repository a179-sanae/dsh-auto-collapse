import type { WorkKind } from './work-groups.js'

export type WorkStatus = 'running' | 'done' | 'error' | 'stopped' | 'waiting'
export interface WorkInfo { kind: WorkKind; action: string; detail: string; status: WorkStatus }
export interface GroupSummary { text: string; detail: string; status: WorkStatus; kind: WorkKind }

export function toolAction(tool: string): string {
  if (/^(write|edit|str_replace|apply_patch)/.test(tool)) return '编辑了文件'
  if (/^(read|glob|grep|list_directory|file_search)/.test(tool)) return '读取了文件'
  if (/^(web_search|search)/.test(tool)) return '搜索了资料'
  if (/(browser|browse|playwright|chrome|web_fetch)/.test(tool)) return '使用了浏览器'
  if (/^(bash|pwsh|shell|run_code|exec|cordis_run)/.test(tool)) return '运行了命令'
  return tool === '' ? '调用了工具' : `调用了 ${tool}`
}

export function normalizeStatus(value: string | null): WorkStatus {
  if (value === 'running') return 'running'
  if (value === 'error' || value === 'failed') return 'error'
  if (value === 'stopped' || value === 'interrupted' || value === 'cancelled') return 'stopped'
  if (value === 'waiting' || value === 'pending' || value === 'approval') return 'waiting'
  return 'done'
}

export function summarize(infos: readonly WorkInfo[]): GroupSummary {
  const last = infos[infos.length - 1]
  const running = [...infos].reverse().find(info => info.status === 'running' || info.status === 'waiting')
  const current = running ?? last
  const actions = [...new Set(infos.map(info => info.action))]
  const status = running?.status ?? (infos.some(info => info.status === 'error') ? 'error' : infos.some(info => info.status === 'stopped') ? 'stopped' : 'done')
  let text = actions.join(' · ')
  let detail = ''
  if (running !== undefined) {
    const active = running.status === 'waiting' ? '等待操作' : running.kind === 'think' ? '正在思考' : running.kind === 'context' ? '正在注入上下文' : '正在运行'
    text = [...actions.filter(action => action !== running.action), active].join(' · ')
    detail = running.detail
  } else if (status === 'error') text += ' · 出错'
  else if (status === 'stopped') text += ' · 已停止'
  return { text: text || '工作过程', detail, status, kind: current?.kind ?? 'tool' }
}

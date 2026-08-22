/**
 * dsh-auto-collapse — 插件配置卡片。
 *
 * 在 DSH Web 设置 → 插件 → 插件配置 中追加“状态提示词”卡片，编辑
 * dsh-auto-collapse 的 settings 命名空间。卡片只做暂存与保存，不改动
 * 业务逻辑；运行时文字替换由 FoldController 读取同一 scope 后实时生效。
 */

/** settings 命名空间。Host 侧与客户端侧使用同一个值才能配对出现。 */
export const AUTO_COLLAPSE_NS = 'dsh-auto-collapse'

/** 默认状态提示词。 */
export const DEFAULT_STATUS_TEXT = 'Deep sleeping...'

declare const require: (id: string) => any

/** 客户端 settings scope 的最小结构化类型。 */
export interface SettingsScopeLike {
  getSnapshot(): {
    status: 'loading' | 'ready' | 'unavailable'
    value?: Record<string, unknown>
    base?: Record<string, unknown>
    user?: Record<string, unknown>
    writable: boolean
  }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
  unset(field: string): Promise<void>
}

/** 客户端 slots 服务的最小结构化类型。 */
export interface SlotsLike {
  inject(key: string, callback: () => unknown): () => void
  register(
    options: { name: string; key: string; inject: () => unknown },
    renderer: (props: { scope: SettingsScopeLike }) => unknown,
  ): unknown
}

/** 从绑定的 settings scope 构造实时状态提示词读取器。 */
export function statusTextProvider(scope: SettingsScopeLike | undefined): () => string | undefined {
  return () => {
    if (scope === undefined) return DEFAULT_STATUS_TEXT
    const snapshot = scope.getSnapshot()
    const value = snapshot.value as { statusText?: string } | undefined
    return value?.statusText ?? DEFAULT_STATUS_TEXT
  }
}

const CARD_CSS = `
.dshcf-settings-card {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  border-radius: 12px;
  list-style: none;
  transition: border-color .16s, background .16s;
}
.dshcf-settings-card:hover { border-color: var(--dsw-alias-label-dimmed); }
.dshcf-settings-cardOpen {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-label-dimmed);
}
.dshcf-settings-header {
  appearance: none;
  width: 100%;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: 0 0;
  border: 0;
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  display: flex;
}
.dshcf-settings-header:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.dshcf-settings-headText { flex-direction: column; flex: 1; gap: 4px; min-width: 0; display: flex; }
.dshcf-settings-name { color: var(--dsw-alias-label-primary); font-size: 15px; font-weight: 600; line-height: 1.4; }
.dshcf-settings-description { color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1.5; }
.dshcf-settings-chevron { color: var(--dsw-alias-label-tertiary); flex: none; transition: transform .16s; }
.dshcf-settings-chevronOpen { transform: rotate(180deg); }
.dshcf-settings-pending {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  flex: none;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dshcf-settings-body { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 16px; padding-bottom: 8px; }
.dshcf-settings-readOnly { color: var(--dsw-alias-label-tertiary); margin: 12px 0 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-field { flex-direction: column; gap: 6px; padding: 12px 0; display: flex; }
.dshcf-settings-fieldHead { align-items: center; gap: 8px; display: flex; }
.dshcf-settings-fieldLabel { min-width: 0; color: var(--dsw-alias-label-primary); flex: 1; font-size: 13px; font-weight: 500; line-height: 1.5; }
.dshcf-settings-badges { align-items: center; gap: 8px; display: inline-flex; }
.dshcf-settings-badge {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dshcf-settings-reset { font: inherit; color: var(--dsw-alias-label-secondary); cursor: pointer; background: 0 0; border: none; padding: 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-reset:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.dshcf-settings-reset:disabled { cursor: default; }
.dshcf-settings-input {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  height: 34px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
  width: 100%;
}
.dshcf-settings-input:focus-visible { border-color: var(--dsw-alias-brand-primary); outline: none; }
.dshcf-settings-input:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.dshcf-settings-hint { color: var(--dsw-alias-label-tertiary); margin: 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-footer { border-top: 1px solid var(--dsw-alias-border-l2); justify-content: flex-end; align-items: center; gap: 8px; padding: 12px 0 4px; display: flex; }
.dshcf-settings-failed { min-width: 0; color: var(--dsw-alias-label-error); flex: 1; margin: 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-discard,
.dshcf-settings-save { appearance: none; font: inherit; cursor: pointer; border: 1px solid #0000; border-radius: 8px; padding: 5px 14px; font-size: 13px; line-height: 1.5; }
.dshcf-settings-discard { border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); background: 0 0; }
.dshcf-settings-discard:hover:not(:disabled) { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
.dshcf-settings-save { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); }
.dshcf-settings-discard:disabled,
.dshcf-settings-save:disabled { opacity: .4; cursor: default; }
.dshcf-settings-discard:focus-visible,
.dshcf-settings-save:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
`

const STYLE_ID = 'dshcf-settings-style'

function injectCardStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CARD_CSS
  document.head.appendChild(style)
}

function ChevronIcon(open: boolean): any {
  const React = require('react')
  const className = open ? 'dshcf-settings-chevron dshcf-settings-chevronOpen' : 'dshcf-settings-chevron'
  return React.createElement(
    'svg',
    { width: 14, height: 14, viewBox: '0 0 14 14', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true, className },
    React.createElement('path', {
      d: 'M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z',
      fill: 'currentColor',
    }),
  )
}

function StatusTextCard(props: { scope: SettingsScopeLike }): any {
  const React = require('react')
  const scope = props.scope
  const [open, setOpen] = React.useState(false)
  const [snapshot, setSnapshot] = React.useState(scope.getSnapshot())
  const [pending, setPending] = React.useState(null as { text: string; reset: boolean } | null)
  const [saving, setSaving] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => scope.subscribe(() => setSnapshot(scope.getSnapshot())), [scope])

  if (snapshot.status !== 'ready') return null

  const value = snapshot.value as { statusText?: string } | undefined
  const base = snapshot.base as { statusText?: string } | undefined
  const user = snapshot.user as Record<string, unknown> | undefined
  const currentText = value?.statusText ?? ''
  const defaultText = base?.statusText ?? DEFAULT_STATUS_TEXT
  const text = pending ? pending.text : currentText
  const userHas = user !== undefined && Object.prototype.hasOwnProperty.call(user, 'statusText')
  const overridden = pending ? !pending.reset : userHas
  const dirty = pending !== null && (pending.reset ? userHas : pending.text.trim() !== currentText)
  const writable = snapshot.writable

  const discard = () => {
    setPending(null)
    setFailed(false)
  }
  const resetField = () => {
    setPending({ text: defaultText, reset: true })
    setFailed(false)
  }
  const edit = (next: string) => {
    setPending({ text: next, reset: false })
    setFailed(false)
  }
  const save = async () => {
    if (pending === null) return
    setSaving(true)
    setFailed(false)
    try {
      // 显式“恢复默认”才清除 user layer，回落到 schema 默认 Deep sleeping...
      // 手动清空并保存则是写入空字符串：让插件停止替换，恢复官方 Deep diving...
      if (pending.reset) await scope.unset('statusText')
      else await scope.set('statusText', pending.text.trim())
      setPending(null)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const blocked = !dirty || saving
  const cardClass = `dshcf-settings-card${open ? ' dshcf-settings-cardOpen' : ''}`

  return React.createElement('li', { className: cardClass }, [
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'dshcf-settings-header',
        'aria-expanded': open,
        'aria-label': `${open ? '收起设置' : '展开设置'}: 状态提示词`,
        onClick: () => setOpen(!open),
      },
      [
        React.createElement('span', { className: 'dshcf-settings-headText' }, [
          React.createElement('span', { className: 'dshcf-settings-name' }, '状态提示词'),
          React.createElement('span', { className: 'dshcf-settings-description' }, '自定义状态提示词，可以替换原有的Deep diving...一行，由插件dsh-auto-collapse提供'),
        ]),
        dirty ? React.createElement('span', { className: 'dshcf-settings-pending' }, '未保存') : null,
        ChevronIcon(open),
      ],
    ),
    open
      ? React.createElement('div', { className: 'dshcf-settings-body' }, [
          !writable
            ? React.createElement('p', { className: 'dshcf-settings-readOnly', role: 'status' }, '本部署的设置为只读。')
            : null,
          React.createElement('div', { className: 'dshcf-settings-field' }, [
            React.createElement('div', { className: 'dshcf-settings-fieldHead' }, [
              React.createElement('label', { className: 'dshcf-settings-fieldLabel', htmlFor: 'dshcf-status-text' }, '自定义状态提示词'),
              overridden
                ? React.createElement('span', { className: 'dshcf-settings-badges' }, [
                    React.createElement('span', { className: 'dshcf-settings-badge' }, '已覆盖'),
                    React.createElement('button', { type: 'button', className: 'dshcf-settings-reset', disabled: !writable, onClick: resetField }, '恢复默认'),
                  ])
                : null,
            ]),
            React.createElement('input', {
              id: 'dshcf-status-text',
              className: 'dshcf-settings-input',
              type: 'text',
              value: text,
              placeholder: 'Deep diving...',
              disabled: !writable,
              onChange: (event: { target: { value: string } }) => edit(event.target.value),
            }),
            React.createElement('p', { className: 'dshcf-settings-hint' }, '为空时恢复默认Deep diving...提示词状态'),
          ]),
          React.createElement('div', { className: 'dshcf-settings-footer' }, [
            failed
              ? React.createElement('p', { className: 'dshcf-settings-failed', role: 'status' }, '本部署没有接受这些值，已保留供你修改。')
              : null,
            React.createElement('button', { type: 'button', className: 'dshcf-settings-discard', disabled: !dirty || saving, onClick: discard }, '放弃修改'),
            React.createElement('button', { type: 'button', className: 'dshcf-settings-save', disabled: blocked, onClick: save }, saving ? '保存中…' : '保存'),
          ]),
        ])
      : null,
  ])
}

/** 向 DSH 插件配置页注册“状态提示词”卡片。 */
export function setupSettingsCard(ctx: { slots: SlotsLike }, scope: SettingsScopeLike): () => void {
  injectCardStyle()
  return ctx.slots.inject('settings.plugin.item', () => ctx.slots.register(
    {
      name: 'settings.plugin.item',
      key: AUTO_COLLAPSE_NS,
      inject: () => ({ scope }),
    },
    StatusTextCard,
  ))
}

/**
 * dsh-auto-collapse — node half（构建产物，与 src/index.ts 对应）。
 *
 * Host 侧除了让插件出现在宿主插件树之外，还注册一个 `dsh-auto-collapse`
 * settings 命名空间，供浏览器端“插件配置 → 状态提示词”卡片读写。
 * 浏览器端 bundle 由 dsh.client 声明 + exports["./client"] 提供。
 */
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'

export const name = 'dsh-auto-collapse'
export const inject = []

const DEFAULT_STATUS_TEXT = 'Deep sleeping...'
const AUTO_COLLAPSE_SETTINGS_NAMESPACE = settingsNamespace('dsh-auto-collapse')
const AUTO_COLLAPSE_SETTINGS_SCHEMA = z.object({
  statusText: z.string().default(DEFAULT_STATUS_TEXT),
})

export function apply(ctx, config = {}) {
  let current = () => ({ statusText: config.statusText ?? DEFAULT_STATUS_TEXT })
  installSettingsSection(ctx, AUTO_COLLAPSE_SETTINGS_NAMESPACE, AUTO_COLLAPSE_SETTINGS_SCHEMA, {
    statusText: config.statusText ?? DEFAULT_STATUS_TEXT,
  }, {
    setSource: (source) => {
      current = source
    },
    onChange: () => {
      void current
    },
  })
}

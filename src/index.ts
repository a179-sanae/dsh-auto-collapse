/**
 * dsh-auto-collapse — node half.
 *
 * Host 侧除了让插件出现在宿主插件树之外，还注册一个 `dsh-auto-collapse`
 * settings 命名空间，供浏览器端“插件配置 → 状态提示词”卡片读写。
 * 浏览器端 bundle 通过 package.json 的 dsh.client 声明 + exports["./client"]
 * 被 dsh web 的 client-modules 服务发现并注入页面。
 */
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'

/** Host 插件名。 */
export const name = 'dsh-auto-collapse'

/** Host 侧不注入额外服务；settings 是可选的运行能力，由 installSettingsSection 惰性接入。 */
export const inject: string[] = []

/** 默认状态提示词。 */
const DEFAULT_STATUS_TEXT = 'Deep sleeping...'

/** 本插件拥有并暴露给插件配置页的 settings 命名空间。 */
const AUTO_COLLAPSE_SETTINGS_NAMESPACE = settingsNamespace('dsh-auto-collapse')

/** 设置结构：只有状态提示词字段。 */
const AUTO_COLLAPSE_SETTINGS_SCHEMA = z.object({
  statusText: z.string().default(DEFAULT_STATUS_TEXT),
})

/** 插件配置。 */
export interface Config {
  /** 自定义状态提示词；留空恢复官方 "Deep diving..."。 */
  statusText?: string
}

/** Host 插件体：注册设置命名空间。 */
export function apply(ctx: any, config: Config = {}): void {
  let current = () => ({ statusText: config.statusText ?? DEFAULT_STATUS_TEXT })
  installSettingsSection(ctx, AUTO_COLLAPSE_SETTINGS_NAMESPACE, AUTO_COLLAPSE_SETTINGS_SCHEMA, {
    statusText: config.statusText ?? DEFAULT_STATUS_TEXT,
  }, {
    setSource: (source: () => { statusText: string }) => {
      current = source
    },
    onChange: () => {
      // Host 侧不消费该设置，实际替换发生在浏览器端 FoldController。
      void current
    },
  })
}

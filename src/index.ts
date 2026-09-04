/**
 * dsh-auto-collapse — node half.
 *
 * Host 侧除了让插件出现在宿主插件树之外，还注册一个 `dsh-auto-collapse`
 * settings 命名空间，供浏览器端“插件配置 → 状态提示词”卡片读写。
 * 浏览器端 bundle 通过 package.json 的 dsh.client 声明 + exports["./client"]
 * 被 dsh web 的 client-modules 服务发现并注入页面。
 *
 * 兼容性（DSH 0.1.2-rc.1 起）：
 * `@deepseek-ai/dsh-settings` 在 0.1.2-rc.1 删除了 installSettingsSection /
 * settingsNamespace 两个导出（改为 SettingsProvider 上的 installSection 方法）。
 * 这里不再 import 官方包：本地实现等价的“可选 settings 消费者”接线
 * （ctx.inject(['settings']) + register + watch），与官方 0.1.1 的
 * installSettingsSection 内部实现同构，也是社区在 0.1.2 下沿用的模式
 * （如 dsh-ui-web / dsh-token-plan-monitor）。命名空间改为普通字符串，
 * 0.1.2 的 register 会自行校验小写连字符格式。
 */
import z from '@deepseek-ai/schemastery'

/** Host 插件名。 */
export const name = 'dsh-auto-collapse'

/** Host 侧不注入额外服务；settings 是可选的运行能力，由下方接线惰性接入。 */
export const inject: string[] = []

/** 默认状态提示词。 */
const DEFAULT_STATUS_TEXT = 'Deep sleeping...'

/** 本插件拥有并暴露给插件配置页的 settings 命名空间（0.1.2 起为普通字符串）。 */
const AUTO_COLLAPSE_SETTINGS_NAMESPACE = 'dsh-auto-collapse'

/** 设置结构：只有状态提示词字段。 */
const AUTO_COLLAPSE_SETTINGS_SCHEMA = z.object({
  statusText: z.string().default(DEFAULT_STATUS_TEXT),
})

/** 插件配置。 */
export interface Config {
  /** 自定义状态提示词；留空恢复官方 "Deep diving..."。 */
  statusText?: string
}

/* ---------- dsh-settings 服务最小结构（本地声明，运行时由宿主提供） ---------- */

/** FiberState 常量镜像（cordis const enum 无运行时对象，值需硬编码）。 */
const FIBER_DISPOSED = 4
const FIBER_UNLOADING = 5

/** 插件自身的 fiber 是否正在卸载（区别于仅仅失去 settings 服务）。 */
function isUnloading(ctx: unknown): boolean {
  const state = (ctx as { fiber?: { state?: number } } | undefined)?.fiber?.state
  return state === FIBER_UNLOADING || state === FIBER_DISPOSED
}

/** settings 消费者钩子，与官方 SettingsSectionHooks 同形。 */
export interface SettingsSectionHooks<T> {
  setSource(source: () => T): void
  onChange(): void
  validate?(value: T): void
}

/** 注册后拿到的 scope 最小结构。 */
interface SettingsScopeLike<T> {
  get(): T
  watch(callback: (next: T) => void): () => void
}

/** settings 服务（SettingsProvider）最小结构。 */
interface SettingsServiceLike {
  register<T>(
    namespace: string,
    schema: unknown,
    options?: { base?: T; validate?: (value: T) => void },
  ): SettingsScopeLike<T>
}

/** 注入回调拿到的上下文最小结构。 */
interface SettingsServiceContext {
  settings: SettingsServiceLike
  effect(fn: () => () => void): void
}

/** 宿主插件上下文最小结构（仅需要 cordis 标准 inject）。 */
interface SettingsHostContext {
  inject(services: readonly string[], setup: (sctx: SettingsServiceContext) => void): void
}

/**
 * 可选 settings 消费者接线。
 *
 * 等价于官方 0.1.1 的 installSettingsSection（register 以 entry 作为 base 层，
 * 服务存在时 source 指向已解析 scope；服务 detach 时回落到 entry），且兼容
 * 0.1.2 的 SettingsProvider#register 语义。不 import 官方包，避免随上游版本
 * 漂移导致 ESM 加载失败。
 */
function installSettingsSection<T = unknown>(
  ctx: SettingsHostContext | unknown,
  ns: string,
  schema: unknown,
  entry: T,
  hooks: SettingsSectionHooks<T>,
): void {
  ;(ctx as SettingsHostContext).inject(['settings'], (sctx) => {
    const scope = sctx.settings.register<T>(ns, schema, {
      base: entry,
      ...(hooks.validate === undefined ? {} : { validate: hooks.validate }),
    })
    hooks.setSource(() => scope.get())
    sctx.effect(() => () => {
      if (isUnloading(ctx)) return
      hooks.setSource(() => entry)
      hooks.onChange()
    })
    hooks.onChange()
    scope.watch(() => {
      if (isUnloading(ctx)) return
      hooks.onChange()
    })
  })
}

/** Host 插件体：注册设置命名空间。 */
export function apply(ctx: unknown, config: Config = {}): void {
  let current = () => ({ statusText: config.statusText ?? DEFAULT_STATUS_TEXT })
  installSettingsSection(
    ctx,
    AUTO_COLLAPSE_SETTINGS_NAMESPACE,
    AUTO_COLLAPSE_SETTINGS_SCHEMA,
    {
      statusText: config.statusText ?? DEFAULT_STATUS_TEXT,
    },
    {
      setSource: (source: () => { statusText: string }) => {
        current = source
      },
      onChange: () => {
        // Host 侧不消费该设置，实际替换发生在浏览器端 FoldController。
        void current
      },
    },
  )
}
/**
 * dsh-auto-collapse — browser half（客户端插件入口）。
 *
 * 职责：
 * 1. 把会话正文之外的工具 display（read / bash / web_search / think 推理
 *    块等非正文卡片）折叠成内联的一行，折叠行实时显示当前正在进行的工作
 *    （工具名 + 正在执行的命令/参数，或思考的最新一行）；运行中标题与摘
 *    要带平滑呼吸动画（Pulse）。点击展开/收起。
 * 2. 把官方 ChatView 尾部运行状态行（"深度求索中..." / 旧版
 *    "Deep diving..."）替换为可配置的 "Deep sleeping..."（流光特效不变，始终生效）。
 * 3. 通过 DSH 设置 → 插件 → 插件配置 的“状态提示词”卡片编辑替换文案。
 *
 * 实现方式：纯 DOM 层（MutationObserver + rAF 合并），零核心改动、零运行时
 * 依赖。识别依据是 ChatView 渲染时写死的稳定 data 属性
 * （data-chat-flow / data-chat-call-id / data-tool / data-state /
 * data-variant / data-chat-anchor-key / data-subcalls / data-follow-end /
 * data-disclosure-row），与官方 Web 客户端的 DOM 契约对齐。
 */
import { FoldController } from './fold.js'
import {
  AUTO_COLLAPSE_NS,
  DEFAULT_STATUS_TEXT,
  setupSettingsCard,
  statusTextProvider,
  type SettingsScopeLike,
  type SlotsLike,
} from './settings.js'

export const name = 'dsh-auto-collapse'

/**
 * 不声明必需服务：slots/settingsScope 只是可选增强能力，不能阻止核心折叠
 * 插件启动。下方通过 ctx.inject() 等待两个服务，支持晚于插件出现
 * 以及卸载后重连；服务永久缺席时仅跳过设置卡片与配置订阅。
 */
export const inject: string[] = []

/** 客户端根上下文的最小结构化类型（仅用 cordis 标准 effect，无运行时依赖）。 */
export interface FoldClientCtx {
  effect(fn: () => unknown, label?: string): unknown
  /** Cordis 动态客户端上下文提供的可选服务查询。 */
  get?<T>(name: string): T | undefined
  /** 可选服务生命周期：服务齐备时进入，detach 时自动清理回调上的 effect。 */
  inject?(
    services: readonly string[],
    setup: (ctx: FoldClientCtx) => void,
  ): void
}

export function apply(ctx: FoldClientCtx): void {
  const fallbackStatusText = () => DEFAULT_STATUS_TEXT
  // FoldController 一生只持有这个稳定闭包；settings 服务重连时
  // 替换其当前源，无需重建 observer 或折叠状态。
  let readStatusText: () => string | undefined = fallbackStatusText
  const controller = new FoldController(() => readStatusText())

  // 注意:cordis 的 ctx.effect(fn) 会【立即执行】fn,并把 fn 的返回值当作
  // 插件卸载时的清理函数(与 ui-slash 等官方插件同款写法)。
  ctx.effect(() => {
    controller.start()
    return () => controller.stop()
  }, 'dsh-auto-collapse: fold observer')

  // ctx.get() 是一次性快照：0.1.2 启动期间若 slots/settingsScope 尚未
  // provide，直接 get 会让设置卡永久丢失。ctx.inject() 把连接变成
  // 可重连生命周期，与 DSH 0.1.2 官方客户端插件的可选服务用法一致。
  ctx.inject?.(['settingsScope', 'slots'], (serviceCtx) => {
    serviceCtx.effect(() => {
      const settingsScope = serviceCtx.get?.<{ bind(spec: { namespace: string }): SettingsScopeLike }>('settingsScope')
      const slots = serviceCtx.get?.<SlotsLike>('slots')
      if (settingsScope === undefined || slots === undefined) return

      const scope = settingsScope.bind({ namespace: AUTO_COLLAPSE_NS })
      const scopedStatusText = statusTextProvider(scope)
      const offScope = scope.subscribe(() => controller.refresh())
      let offSettings: () => void
      try {
        offSettings = setupSettingsCard({ slots }, scope)
      } catch (error) {
        offScope()
        throw error
      }
      readStatusText = scopedStatusText
      controller.refresh()

      return () => {
        offScope()
        offSettings()
        // 旧服务的迟到 cleanup 不得覆盖已重连的新源。
        if (readStatusText === scopedStatusText) {
          readStatusText = fallbackStatusText
          controller.refresh()
        }
      }
    }, 'dsh-auto-collapse: settings scope + plugin card')
  })
}

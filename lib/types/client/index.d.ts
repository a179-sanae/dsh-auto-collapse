/**
 * dsh-auto-collapse — browser half 类型声明。
 *
 * 折叠会话里的工具卡片与 Think 推理块；把官方 "Deep diving..." 运行状态行
 * 替换为可配置的状态提示词（默认 "Deep sleeping..."，为空时不替换）。
 * 同时注册 DSH 设置 → 插件 → 插件配置的“状态提示词”卡片。
 */

/** 客户端根上下文的最小结构化类型（仅用 cordis 标准 effect，运行时通过 slot 注册配置卡片）。 */
export interface FoldClientCtx {
  effect(fn: () => unknown, label?: string): unknown
}

export declare const name: string
export declare const inject: string[]
export declare function apply(ctx: FoldClientCtx): void

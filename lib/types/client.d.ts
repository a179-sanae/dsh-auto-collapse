export declare const name = "dsh-auto-collapse";
/**
 * 不声明必需服务：slots/settingsScope 只是可选增强能力，不能阻止核心折叠
 * 插件启动。下方通过 ctx.inject() 等待两个服务，支持晚于插件出现
 * 以及卸载后重连；服务永久缺席时仅跳过设置卡片与配置订阅。
 */
export declare const inject: string[];
/** 客户端根上下文的最小结构化类型（仅用 cordis 标准 effect，无运行时依赖）。 */
export interface FoldClientCtx {
    effect(fn: () => unknown, label?: string): unknown;
    /** Cordis 动态客户端上下文提供的可选服务查询。 */
    get?<T>(name: string): T | undefined;
    /** 可选服务生命周期：服务齐备时进入，detach 时自动清理回调上的 effect。 */
    inject?(services: readonly string[], setup: (ctx: FoldClientCtx) => void): void;
}
export declare function apply(ctx: FoldClientCtx): void;

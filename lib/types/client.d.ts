export declare const name = "dsh-auto-collapse";
/**
 * 不声明必需服务：slots/settingsScope 只是可选增强能力，不能阻止核心折叠
 * 插件启动。运行时通过 ctx.get() 读取，服务不存在时仅跳过设置卡片与配置订阅。
 */
export declare const inject: string[];
/** 客户端根上下文的最小结构化类型（仅用 cordis 标准 effect，无运行时依赖）。 */
export interface FoldClientCtx {
    effect(fn: () => unknown, label?: string): unknown;
    /** Cordis 动态客户端上下文提供的可选服务查询。 */
    get?<T>(name: string): T | undefined;
}
export declare function apply(ctx: FoldClientCtx): void;

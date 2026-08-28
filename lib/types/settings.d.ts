/**
 * dsh-auto-collapse — 插件配置卡片。
 *
 * 在 DSH Web 设置 → 插件 → 插件配置 中追加“状态提示词”卡片，编辑
 * dsh-auto-collapse 的 settings 命名空间。卡片只做暂存与保存，不改动
 * 业务逻辑；运行时文字替换由 FoldController 读取同一 scope 后实时生效。
 */
/** settings 命名空间。Host 侧与客户端侧使用同一个值才能配对出现。 */
export declare const AUTO_COLLAPSE_NS = "dsh-auto-collapse";
/** 默认状态提示词。 */
export declare const DEFAULT_STATUS_TEXT = "Deep sleeping...";
/** 客户端 settings scope 的最小结构化类型。 */
export interface SettingsScopeLike {
    getSnapshot(): {
        status: 'loading' | 'ready' | 'unavailable';
        value?: Record<string, unknown>;
        base?: Record<string, unknown>;
        user?: Record<string, unknown>;
        writable: boolean;
    };
    subscribe(listener: () => void): () => void;
    set(field: string, value: unknown): Promise<void>;
    unset(field: string): Promise<void>;
}
/** 客户端 slots 服务的最小结构化类型。 */
export interface SlotsLike {
    inject(key: string, callback: () => unknown): () => void;
    register(options: {
        name: string;
        key: string;
        inject: () => unknown;
    }, renderer: (props: {
        scope: SettingsScopeLike;
    }) => unknown): unknown;
}
/** 从绑定的 settings scope 构造实时状态提示词读取器。 */
export declare function statusTextProvider(scope: SettingsScopeLike | undefined): () => string | undefined;
/** 向 DSH 插件配置页注册“状态提示词”卡片。 */
export declare function setupSettingsCard(ctx: {
    slots: SlotsLike;
}, scope: SettingsScopeLike): () => void;

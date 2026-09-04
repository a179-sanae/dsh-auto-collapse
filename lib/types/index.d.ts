/** Host 插件名。 */
export declare const name = "dsh-auto-collapse";
/** Host 侧不注入额外服务；settings 是可选的运行能力，由下方接线惰性接入。 */
export declare const inject: string[];
/** 插件配置。 */
export interface Config {
    /** 自定义状态提示词；留空恢复官方 "Deep diving..."。 */
    statusText?: string;
}
/** settings 消费者钩子，与官方 SettingsSectionHooks 同形。 */
export interface SettingsSectionHooks<T> {
    setSource(source: () => T): void;
    onChange(): void;
    validate?(value: T): void;
}
/** Host 插件体：注册设置命名空间。 */
export declare function apply(ctx: unknown, config?: Config): void;

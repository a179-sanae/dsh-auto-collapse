/**
 * dsh-auto-collapse — host half 类型声明。
 *
 * 注册 `dsh-auto-collapse` settings 命名空间，供浏览器端插件配置卡片读写；
 * 浏览器端 bundle 通过 package.json 的 dsh.client 声明 + exports["./client"]
 * 被 dsh web 的 client-modules 服务发现并注入页面。
 */

/** Host 插件名。 */
export declare const name: 'dsh-auto-collapse'

/** Host 侧不注入额外服务。 */
export declare const inject: string[]

/** 插件配置。 */
export interface Config {
  /** 自定义状态提示词；留空恢复官方 "Deep diving..."。 */
  statusText?: string
}

/** Host 插件体：注册设置命名空间。 */
export declare function apply(ctx: unknown, config?: Config): void

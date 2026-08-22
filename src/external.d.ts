/** 宿主侧官方模块的最小声明：仓库本地不安装这些包，运行时由 DSH profile 提供。 */
declare module '@deepseek-ai/schemastery' {
  interface Schema<T = any> {
    default(value: T): Schema<T>
    toJSON(): unknown
  }
  const z: {
    object<T>(shape: Record<string, unknown>): Schema<T>
    string(): Schema<string>
  }
  export default z
}

declare module '@deepseek-ai/dsh-settings' {
  export interface SettingsNamespace {
    readonly __brand: 'SettingsNamespace'
  }
  export interface SettingsSectionHooks<T> {
    validate?: (value: T) => void
    setSource: (source: () => T) => void
    onChange: () => void
  }
  export function settingsNamespace(value: string): SettingsNamespace
  export function installSettingsSection<T>(
    ctx: unknown,
    ns: SettingsNamespace,
    schema: unknown,
    entry: T,
    hooks: SettingsSectionHooks<T>,
  ): void
}

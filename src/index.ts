/** Host half: preserve the existing optional statusText namespace. DSH owns its lifetime. */
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-auto-collapse'
export const inject: string[] = []
const DEFAULT_STATUS_TEXT = 'Deep sleeping...'

export interface Config {
  /** Empty text restores the official status copy. */
  statusText?: string
}

export interface SettingsHostContext {
  inject(services: readonly string[], setup: (ctx: {
    settings: { register(namespace: string, schema: unknown, options: { base: { statusText: string } }): unknown }
  }) => void): unknown
}

export function apply(ctx: SettingsHostContext, config: Config = {}): void {
  ctx.inject(['settings'], service => {
    // The shipped SettingsProvider.register() creates a ctx.effect-owned registration.
    // The host half does not consume this setting, so no watcher or fiber-state mirror is needed.
    service.settings.register(name, z.object({ statusText: z.string().default(DEFAULT_STATUS_TEXT) }), {
      base: { statusText: config.statusText ?? DEFAULT_STATUS_TEXT },
    })
  })
}

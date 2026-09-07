export declare const name = "dsh-auto-collapse";
export declare const inject: string[];
export interface Config {
    /** Empty text restores the official status copy. */
    statusText?: string;
}
export interface SettingsHostContext {
    inject(services: readonly string[], setup: (ctx: {
        settings: {
            register(namespace: string, schema: unknown, options: {
                base: {
                    statusText: string;
                };
            }): unknown;
        };
    }) => void): unknown;
}
export declare function apply(ctx: SettingsHostContext, config?: Config): void;

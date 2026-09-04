import z from "@deepseek-ai/schemastery";
const name = "dsh-auto-collapse";
const inject = [];
const DEFAULT_STATUS_TEXT = "Deep sleeping...";
const AUTO_COLLAPSE_SETTINGS_NAMESPACE = "dsh-auto-collapse";
const AUTO_COLLAPSE_SETTINGS_SCHEMA = z.object({
  statusText: z.string().default(DEFAULT_STATUS_TEXT)
});
const FIBER_DISPOSED = 4;
const FIBER_UNLOADING = 5;
function isUnloading(ctx) {
  const state = ctx?.fiber?.state;
  return state === FIBER_UNLOADING || state === FIBER_DISPOSED;
}
function installSettingsSection(ctx, ns, schema, entry, hooks) {
  ;
  ctx.inject(["settings"], (sctx) => {
    const scope = sctx.settings.register(ns, schema, {
      base: entry,
      ...hooks.validate === void 0 ? {} : { validate: hooks.validate }
    });
    hooks.setSource(() => scope.get());
    sctx.effect(() => () => {
      if (isUnloading(ctx)) return;
      hooks.setSource(() => entry);
      hooks.onChange();
    });
    hooks.onChange();
    scope.watch(() => {
      if (isUnloading(ctx)) return;
      hooks.onChange();
    });
  });
}
function apply(ctx, config = {}) {
  let current = () => ({ statusText: config.statusText ?? DEFAULT_STATUS_TEXT });
  installSettingsSection(
    ctx,
    AUTO_COLLAPSE_SETTINGS_NAMESPACE,
    AUTO_COLLAPSE_SETTINGS_SCHEMA,
    {
      statusText: config.statusText ?? DEFAULT_STATUS_TEXT
    },
    {
      setSource: (source) => {
        current = source;
      },
      onChange: () => {
        void current;
      }
    }
  );
}
export {
  apply,
  inject,
  name
};

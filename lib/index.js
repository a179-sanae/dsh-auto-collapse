import z from "@deepseek-ai/schemastery";
const name = "dsh-auto-collapse";
const inject = [];
const DEFAULT_STATUS_TEXT = "Deep sleeping...";
function apply(ctx, config = {}) {
  ctx.inject(["settings"], (service) => {
    service.settings.register(name, z.object({ statusText: z.string().default(DEFAULT_STATUS_TEXT) }), {
      base: { statusText: config.statusText ?? DEFAULT_STATUS_TEXT }
    });
  });
}
export {
  apply,
  inject,
  name
};

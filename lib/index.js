import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
const name = "dsh-auto-collapse";
const inject = [];
const DEFAULT_STATUS_TEXT = "Deep sleeping...";
const AUTO_COLLAPSE_SETTINGS_NAMESPACE = settingsNamespace("dsh-auto-collapse");
const AUTO_COLLAPSE_SETTINGS_SCHEMA = z.object({
  statusText: z.string().default(DEFAULT_STATUS_TEXT)
});
function apply(ctx, config = {}) {
  let current = () => ({ statusText: config.statusText ?? DEFAULT_STATUS_TEXT });
  installSettingsSection(ctx, AUTO_COLLAPSE_SETTINGS_NAMESPACE, AUTO_COLLAPSE_SETTINGS_SCHEMA, {
    statusText: config.statusText ?? DEFAULT_STATUS_TEXT
  }, {
    setSource: (source) => {
      current = source;
    },
    onChange: () => {
      void current;
    }
  });
}
export {
  apply,
  inject,
  name
};

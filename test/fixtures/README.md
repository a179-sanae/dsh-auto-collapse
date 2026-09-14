# Native contract fixture

The current native snapshots come from installed DSH **0.1.5-rc.2** packages. The capture utility checks that the CLI, Chat, Tool and frontend packages all match that version. Each snapshot records its source bundle SHA-256 and license.

| File | Captured implementation |
|---|---|
| `native.jsx` | Unmodified `ReasoningRow`, `TurnProcessNodeView`, `SystemPromptRow`, `useSearchableHidden` and `DisclosureRow` |
| `native-tool.js` | Complete unmodified `@deepseek-ai/dsh-client-ui-tool` client bundle, including registration, call trees, card models, tool rows and CSS |
| `native-terminal.jsx` | Unmodified `TerminalBlock` and its parsing, ANSI rendering, clipping and clipboard helpers |

The snapshots use React **18.3.1**, matching the current frontend. The fixture supplies CSS class bindings, decorative glyphs and synthetic locale/session/slot services. `OpaqueBody` renders synthetic prompt text in a `pre`. Terminal parsing and body rendering run the shipped code; Anser's MIT notice is retained in `ANSER-LICENSE` and the generated terminal snapshot. Unsupported body primitives fail explicitly when requested.

`app.jsx` supplies synthetic chat nodes, context/tool content, session changes, settings scopes and native turn ownership. A tool fixture with `nativeBlock` uses the captured package's actual `ToolCallTree` and keyed dispatch. Official `pwsh` calls take its `GenericToolCard` fallback, including terminal versus generic-error body selection. Other fixtures keep their small synthetic tool adapters for focused grouping and interaction tests.

`test/browser/pwsh.test.mjs` covers nonzero exits with `isError: false`, NativeCommandError/RemoteException output, repeated failures followed by a successful retry, running-to-error body replacement, persistent-shell results, absent call heads, incomplete arguments, multi-block results, nested calls and completed-turn disclosures. It checks both thrown browser errors and console errors, including the plugin's recovery log. A reasoning case also checks the 0.1.5 summary change while retaining the full native details.

The seat adapter keeps `system-prompt` outside native process membership, matching the host's `TURN_PROCESS_INDEPENDENT_KINDS`. Regression cases verify the plugin's supplemental L1 visibility, mixed L2 grouping, native detail state, turn ownership, search and cleanup.

To refresh the captured version, review and update `test/capture-native-fixture.mjs`, then run it with the absolute path to the supported installed DSH package:

```sh
node test/capture-native-fixture.mjs <installed-DSH-package-directory>
npm run check
```

The frontend's minified bindings are audited for the pinned release. The terminal dependency closure is captured in source declaration order. Keep the generated snapshots in the repository so CI does not depend on a machine's global installation. A new host version requires new contract tests before updating the compatibility statement.

These are browser component tests with synthetic event data, not a complete DSH backend deployment. They never read personal sessions, profiles or credentials. Issue #22 originally reported **0.1.5-rc.1**; the reporter later [attributed the crash to dsh-context 0.52.0](https://github.com/a179-sanae/dsh-auto-collapse/issues/22#issuecomment-5660822106) after reproducing it with auto-collapse disabled. These tests add coverage for the current **0.1.5-rc.2** components; they do not reproduce the original session and browser cache state or represent a runtime fix for that crash.

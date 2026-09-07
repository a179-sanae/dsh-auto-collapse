# Native contract fixture

`native.jsx` captures the unmodified `ReasoningRow`, `TurnProcessNodeView`, `SystemPromptRow`, `useSearchableHidden` and `DisclosureRow` functions from the installed DSH **0.1.2-rc.1** packages. It records package hashes and the original MIT license. Its dependency bindings use real React 18 and JSX runtime; CSS class bindings and glyphs are provided by the fixture theme. `OpaqueBody` renders synthetic prompt text in a `pre`; native system-prompt disclosure state and body mounting remain unchanged.

`app.jsx` supplies synthetic chat nodes, context/tool content, session changes, settings scopes and native turn ownership to these widgets. Native disclosure body mounting, keyboard handling, turn button interaction and beforematch/focus behavior execute the actual shipped widget code. The fixture never reads personal sessions, profiles or credentials and is not a full DSH backend deployment.

The seat adapter keeps `system-prompt` outside native process membership, matching the host's `TURN_PROCESS_INDEPENDENT_KINDS`. Regression cases verify the plugin's supplemental L1 visibility, mixed L2 grouping, native detail state, turn ownership, search and cleanup.

To refresh the captured version, review and update `test/capture-native-fixture.mjs`, then run it with the absolute path to the supported installed DSH package. Commit the resulting fixture so CI does not depend on a machine's global installation. A new host version requires new contract tests before updating the compatibility statement.

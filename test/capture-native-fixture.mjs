// Maintainer utility: capture the exact shipped native widgets, never user/profile data.
// Usage: node test/capture-native-fixture.mjs <installed @deepseek-ai/dsh directory>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const root = process.argv[2]
if (!root) throw new Error('Pass the installed @deepseek-ai/dsh package directory')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
if (pkg.name !== '@deepseek-ai/dsh' || pkg.version !== '0.1.2-rc.1') throw new Error('This capture adapter is pinned to DSH 0.1.2-rc.1')
const scope = join(root, 'node_modules/@deepseek-ai')
const chat = readFileSync(join(scope, 'dsh-client-ui-chat/lib/client.js'), 'utf8')
const assets = join(scope, 'dsh-web-frontend/dist/assets')
const frontend = readdirSync(assets).filter(file => /^index-.*\.js$/.test(file)).map(file => readFileSync(join(assets, file), 'utf8')).find(source => source.includes('keepContentWhenOpen'))
if (!frontend) throw new Error('Native DisclosureRow bundle not found')
const ast = ts.createSourceFile('frontend.js', frontend, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
let disclosure
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.parameters.some(parameter => parameter.getText(ast).includes('keepContentWhenOpen'))) disclosure = node.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
if (!disclosure?.startsWith('function jd(')) throw new Error('Native primitive bindings changed; update the explicit adapter before capturing')
function region(name) {
  const marker = `//#region lib/types/client/chat/${name}.js`
  const start = chat.indexOf(marker)
  const end = chat.indexOf('//#endregion', start)
  if (start === -1 || end === -1) throw new Error(`Missing ${name}`)
  return chat.slice(start + marker.length, end).trim()
}
const license = readFileSync(join(root, 'LICENSE'), 'utf8')
const source = `/*
Captured native widgets from @deepseek-ai/dsh 0.1.2-rc.1.
Functions below are unmodified; only their dependency/CSS bindings are supplied by this test fixture.
Chat bundle SHA-256: ${createHash('sha256').update(chat).digest('hex')}
Frontend bundle SHA-256: ${createHash('sha256').update(frontend).digest('hex')}

${license}
*/
import React from 'react'
import * as JSX from 'react/jsx-runtime'
const react = React
const react_jsx_runtime = JSX
const d = JSX
const Ce = (...classes) => classes.filter(Boolean).join(' ')
const Rn = { root: 'disclosure', row: 'native-row', iconIdle: 'native-icon', chevronHover: 'native-chevron', leading: 'native-leading', title: 'native-title' }
const Dl = props => JSX.jsx('svg', { ...props, width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true, children: JSX.jsx('path', { d: 'm4 5 3 3 3-3', fill: 'none', stroke: 'currentColor' }) })
const ReasoningRow_module_css_default = { root: 'native-think', row: 'native-row', leading: 'native-leading', title: 'native-title', chevron: 'native-chevron', separator: 'native-separator', summary: 'native-summary', summaryText: 'native-summary-text', thinkBody: 'think-body' }
const TurnProcessNodeView_module_css_default = { root: 'native-turn', label: 'native-label', chevron: 'native-chevron' }
const accessibility_module_css_default = { visuallyHidden: 'visually-hidden' }
const _deepseek_ai_dsh_client_ui_primitives = { DisclosureRow: jd, IconThinkOutline14: Dl, IconChevronDownOutline14: Dl }

${disclosure}

${region('searchable-hidden')}

${region('ReasoningRow')}

${region('TurnProcessNodeView')}

export { jd as NativeDisclosureRow, ReasoningRow as NativeReasoningRow, TurnProcessNodeView as NativeTurnProcess, useSearchableHidden }
`
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures/native.jsx'), source)
console.log('Captured exact native disclosure, reasoning, turn-process and searchable-hidden widgets.')

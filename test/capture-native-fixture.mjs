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
const version = '0.1.5-rc.2'
if (pkg.name !== '@deepseek-ai/dsh' || pkg.version !== version) throw new Error(`This capture adapter is pinned to DSH ${version}`)
const scope = join(root, 'node_modules/@deepseek-ai')
for (const name of ['dsh-client-ui-chat', 'dsh-client-ui-tool', 'dsh-web-frontend']) {
  if (JSON.parse(readFileSync(join(scope, name, 'package.json'), 'utf8')).version !== version) throw new Error(`Mixed host versions: ${name}`)
}
const chat = readFileSync(join(scope, 'dsh-client-ui-chat/lib/client.js'), 'utf8')
const tool = readFileSync(join(scope, 'dsh-client-ui-tool/lib/client.js'), 'utf8')
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
if (!disclosure?.startsWith('function Yp(')) throw new Error('Native primitive bindings changed; update the explicit adapter before capturing')

/** Capture the terminal and its real parsing/copy helpers, preserving declaration order. */
function terminalSource() {
  const options = { allowJs: true, noLib: true, noResolve: true }
  const host = ts.createCompilerHost(options)
  host.getSourceFile = name => name === 'frontend.js' ? ast : undefined
  host.fileExists = name => name === 'frontend.js'
  host.readFile = name => name === 'frontend.js' ? frontend : undefined
  const checker = ts.createProgram(['frontend.js'], options, host).getTypeChecker()
  // Audited 0.1.5-rc.2 bindings: React, JSX, class names, CSS, state glyph and status pill.
  const bindings = new Set(['I', 'd', 'Ce', 'i1', 'O6', 'D6'])
  const captured = new Map()
  function capture(node) {
    const name = node.name?.getText(ast)
    if (!name || captured.has(name) || bindings.has(name)) return
    captured.set(name, node)
    function dependency(child) {
      if (ts.isIdentifier(child)) {
        const declaration = checker.getSymbolAtLocation(child)?.valueDeclaration
        if (declaration?.getSourceFile() === ast && (ts.isFunctionDeclaration(declaration) || ts.isVariableDeclaration(declaration))) {
          const topLevel = ts.isFunctionDeclaration(declaration)
            ? ts.isSourceFile(declaration.parent)
            : ts.isVariableDeclarationList(declaration.parent) && ts.isVariableStatement(declaration.parent.parent) && ts.isSourceFile(declaration.parent.parent.parent)
          if (topLevel) capture(declaration)
        }
      }
      ts.forEachChild(child, dependency)
    }
    dependency(node)
  }
  const terminal = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'km')
  if (!terminal?.parameters[0]?.getText(ast).includes('exitCode')) throw new Error('Native TerminalBlock binding changed')
  capture(terminal)
  return [...captured.values()].sort((left, right) => left.pos - right.pos).map(node => {
    if (ts.isFunctionDeclaration(node)) return node.getText(ast)
    const kind = node.parent.flags & ts.NodeFlags.Const ? 'const' : node.parent.flags & ts.NodeFlags.Let ? 'let' : 'var'
    return `${kind} ${node.getText(ast)};`
  }).join('\n\n')
}

function region(name) {
  const marker = `//#region lib/types/client/chat/${name}.js`
  const start = chat.indexOf(marker)
  const end = chat.indexOf('//#endregion', start)
  if (start === -1 || end === -1) throw new Error(`Missing ${name}`)
  return chat.slice(start + marker.length, end).trim()
}
const license = readFileSync(join(root, 'LICENSE'), 'utf8')
const source = `/*
Captured native widgets from @deepseek-ai/dsh ${version}.
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
const Ut = { root: 'disclosure', row: 'native-row', iconIdle: 'native-icon', chevronHover: 'native-chevron', leading: 'native-leading', title: 'native-title' }
const Dl = props => JSX.jsx('svg', { ...props, width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true, children: JSX.jsx('path', { d: 'm4 5 3 3 3-3', fill: 'none', stroke: 'currentColor' }) })
const y3 = Dl
const ReasoningRow_module_css_default = { root: 'native-think', row: 'native-row', leading: 'native-leading', title: 'native-title', chevron: 'native-chevron', separator: 'native-separator', summary: 'native-summary', summaryText: 'native-summary-text', thinkBody: 'think-body' }
const TurnProcessNodeView_module_css_default = { root: 'native-turn', label: 'native-label', chevron: 'native-chevron' }
const ContextInjectionRow_module_css_default = { root: 'native-context', chevron: 'native-chevron', body: 'native-detail' }
const accessibility_module_css_default = { visuallyHidden: 'visually-hidden' }
const _deepseek_ai_dsh_client_ui_primitives = { DisclosureRow: Yp, IconThinkOutline14: Dl, IconChevronDownOutline14: Dl, IconBrowseOutline16: Dl }
const OpaqueBody = ({ content }) => JSX.jsx('pre', { children: content.map(block => block.text).join('') })

${disclosure}

${region('searchable-hidden')}

${region('ReasoningRow')}

${region('TurnProcessNodeView')}

${region('SystemPromptRow')}

export const nativeHostVersion = '${version}'
export { Yp as NativeDisclosureRow, ReasoningRow as NativeReasoningRow, TurnProcessNodeView as NativeTurnProcess, SystemPromptRow as NativeSystemPrompt, useSearchableHidden }
`
const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const terminal = `/*
Captured unmodified TerminalBlock and its dependency closure from DSH ${version}.
Only React, class-name/CSS bindings and decorative state glyphs are supplied by the fixture.
Frontend bundle SHA-256: ${createHash('sha256').update(frontend).digest('hex')}

${license}

ANSI parsing includes Anser. Its original MIT notice follows:
${readFileSync(join(fixtures, 'ANSER-LICENSE'), 'utf8')}
*/
import React from 'react'
import * as JSX from 'react/jsx-runtime'
const I = React
const d = JSX
const Ce = (...classes) => classes.filter(Boolean).join(' ')
const O6 = ({ state, className }) => JSX.jsx('span', { className, 'data-state': state, 'aria-hidden': true, children: '●' })
const D6 = ({ children, className }) => JSX.jsx('span', { className, children })
const i1 = { block: 'native-terminal', header: 'native-terminal-header', prompt: 'native-terminal-prompt', runStateLabel: 'visually-hidden', promptLine: 'native-terminal-prompt-line', runState: 'native-terminal-state', cwd: 'native-terminal-cwd', command: 'native-terminal-command', status: 'native-terminal-status', copyButton: 'native-terminal-copy', empty: 'native-terminal-empty', output: 'native-terminal-output', line: 'native-terminal-line', expand: 'native-terminal-expand' }

${terminalSource()}

export { km as NativeTerminalBlock }
`
writeFileSync(join(fixtures, 'native.jsx'), source)
writeFileSync(join(fixtures, 'native-terminal.jsx'), terminal)
writeFileSync(join(fixtures, 'native-tool.js'), `/*
Captured unmodified @deepseek-ai/dsh-client-ui-tool ${version} client bundle.
Original bundle SHA-256: ${createHash('sha256').update(tool).digest('hex')}

${license}
*/
${tool}`)
console.log(`Captured DSH ${version} native widgets and the complete official Tool renderer.`)

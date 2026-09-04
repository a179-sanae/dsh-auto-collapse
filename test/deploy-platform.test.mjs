/** deploy-platform.test.mjs —— 验证部署脚本的平台路径选择不会依赖 Windows 环境变量。 */
import assert from 'node:assert/strict'
import { join } from 'node:path'
import {
  buildCookieHeader,
  findBootEntryUrl,
  findLatestLaunchToken,
  isExpectedDshWeb,
  expectedComboBytes,
  mintBrowserCookie,
  parseLaunchTokenLine,
  readBrowserSessionSecret,
  resolveDeployPaths,
} from '../deploy.mjs'

const windows = resolveDeployPaths({
  USERPROFILE: '/Users/tester',
  APPDATA: '/Users/tester/AppData/Roaming',
  DSH_DIR: '/opt/dsh/node_modules/@deepseek-ai/dsh',
  DSH_WEB_PORT: '4096',
}, 'win32')
assert.equal(windows.installedLibDir, join('/Users/tester', '.dsh/profiles/web/node_modules/dsh-auto-collapse/lib'))
assert.equal(windows.dshDir, '/opt/dsh/node_modules/@deepseek-ai/dsh')
assert.equal(windows.webPort, 4096)

const linux = resolveDeployPaths({
  HOME: '/home/tester',
  DSH_DIR: '/opt/dsh/node_modules/@deepseek-ai/dsh',
  DSH_LOG_DIR: '/tmp/dsh-test-logs',
}, 'linux')
assert.equal(linux.installedLibDir, join('/home/tester', '.dsh/profiles/web/node_modules/dsh-auto-collapse/lib'))
assert.equal(linux.dshDir, '/opt/dsh/node_modules/@deepseek-ai/dsh')
assert.equal(linux.logDir, '/tmp/dsh-test-logs')
assert.equal(linux.webPort, 3080)

assert.throws(
  () => resolveDeployPaths({ HOME: '/home/tester', DSH_WEB_PORT: '0' }, 'linux'),
  /无效 DSH_WEB_PORT/,
)

console.log('[ALL PASS] deploy platform path resolution')

/** 0.1.2 鉴权会话 helper：launch token 解析、cookie 拼装、boot 图定位（导入见文件顶部）。 */
// launch token 行解析：端口必须匹配，多 profile/端口日志混写时不串台。
assert.equal(parseLaunchTokenLine('dsh web: http://127.0.0.1:3081/?token=AbC-12_x', 3081), 'AbC-12_x')
assert.equal(parseLaunchTokenLine('dsh web: http://127.0.0.1:3080/?token=AbC-12_x', 3081), null)
assert.equal(parseLaunchTokenLine('dsh web: opening the default browser', 3081), null)
assert.equal(parseLaunchTokenLine('', 3081), null)

// 取最新 token：只认最后一次启动的行，旧进程 token 不复用。
const mixedLog = [
  'dsh web: http://127.0.0.1:3080/?token=OLD111',
  'dsh web: opening the default browser',
  'dsh web: http://127.0.0.1:3081/?token=NEW222',
].join('\n')
assert.equal(findLatestLaunchToken(mixedLog, 3081), 'NEW222')
assert.equal(findLatestLaunchToken(mixedLog, 3080), 'OLD111')
assert.equal(findLatestLaunchToken('no tokens here\n', 3081), null)

// Set-Cookie 拼 Cookie 头：只取 name=value 段，丢弃属性段。
assert.equal(
  buildCookieHeader(['s=abc; Path=/; HttpOnly', 't=def; Secure']),
  's=abc; t=def',
)
assert.equal(buildCookieHeader([]), '')
assert.equal(buildCookieHeader(undefined), '')

// boot 图定位：精确 combo URL（含随机 rev）；缺失/损坏返回 null 走回退。
const bootHtml = '<script>globalThis["__DSH_BOOT__"] = {"rev":"x","entries":[' +
  '{"id":"dshmarket","url":"/plugins/??dshmarket/client.js&rev=r1"},' +
  '{"id":"dsh-auto-collapse","url":"/plugins/??dsh-auto-collapse/client.js&rev=r2-0"}' +
  ']};</script>'
assert.equal(
  findBootEntryUrl(bootHtml, 'dsh-auto-collapse'),
  '/plugins/??dsh-auto-collapse/client.js&rev=r2-0',
)
assert.equal(findBootEntryUrl(bootHtml, 'no-such-plugin'), null)
assert.equal(findBootEntryUrl('<html>no boot</html>', 'dsh-auto-collapse'), null)
assert.equal(findBootEntryUrl('<script>globalThis["__DSH_BOOT__"] = {broken;</script>', 'dsh-auto-collapse'), null)

console.log('[ALL PASS] deploy 0.1.2 auth session helpers')

// 持久密钥自签：结构/签名自验证 + 非法输入回退。
import { createHmac } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
const TEST_SECRET = Buffer.from(new Array(32).fill(7)).toString('base64url')
const minted = mintBrowserCookie(3080, TEST_SECRET)
assert.match(minted, /^dsh-auth-[A-Za-z0-9_-]+=v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
const mintedParts = minted.split('=')[1].split('.')
const expectedSig = createHmac('sha256', Buffer.from(TEST_SECRET, 'base64url')).update(mintedParts[1]).digest('base64url')
assert.equal(mintedParts[2], expectedSig)
const mintedPayload = JSON.parse(Buffer.from(mintedParts[1], 'base64url').toString('utf8'))
assert.equal(mintedPayload.version, 1)
assert.equal(mintedPayload.authority, '127.0.0.1:3080')
assert.ok(mintedPayload.expiresAt - mintedPayload.issuedAt <= 600000)
assert.equal(mintBrowserCookie(3080, 'not-a-secret'), null)
assert.equal(mintBrowserCookie(3080, null), null)

// 密钥文件解析：只读目标记录块，缺失回退 null。
const fakeHome = mkdtempSync(join(tmpdir(), 'dsh-home-'))
writeFileSync(join(fakeHome, '.credentials.yaml'), [
  'version: 1',
  'refs:',
  '  other-scope/other-id:',
  '    kind: grant',
  '    payload:',
  '      version: 1',
  '      secret: QUJDRA',
  '  client-connection/browser-session:',
  '    kind: grant',
  '    payload:',
  '      version: 1',
  `      secret: ${TEST_SECRET}`,
  '  trailing-scope/x:',
  '    kind: grant',
].join('\n'))
assert.equal(readBrowserSessionSecret(fakeHome), TEST_SECRET)
assert.equal(readBrowserSessionSecret(join(fakeHome, 'no-such-dir')), null)

console.log('[ALL PASS] deploy cookie minting fallback')

// 进程身份核验：CIM 返回的双反斜杠命令行必须识别为合法 DSH web。
const DSH_DIR_FIXTURE = 'C:/Users/a179/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh'
assert.equal(isExpectedDshWeb({
  commandLine: '"node"   "C:\\Users\\a179\\AppData\\Roaming\\npm\\\\node_modules\\@deepseek-ai\\dsh\\lib\\bin.js" web',
}, DSH_DIR_FIXTURE), true)
assert.equal(isExpectedDshWeb({
  commandLine: 'node C:/Users/a179/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/lib/bin.js web',
}, DSH_DIR_FIXTURE), true)
assert.equal(isExpectedDshWeb({ commandLine: 'node lib/bin.js web' }, DSH_DIR_FIXTURE), true)
assert.equal(isExpectedDshWeb({ commandLine: 'C:\\other\\app.exe --serve' }, DSH_DIR_FIXTURE), false)
assert.equal(isExpectedDshWeb({ commandLine: null }, DSH_DIR_FIXTURE), false)

console.log('[ALL PASS] deploy process identity normalization')

// combo 服务字节复刻：与服务端 buildCombo/comboSource/comboScript 逐字对应。
const comboUrl = '/plugins/??dsh-auto-collapse/client.js&rev=abc-0'
assert.equal(
  expectedComboBytes(Buffer.from('code();'), comboUrl).toString('utf8'),
  'code();\n;\n//# sourceMappingURL=/plugins/??dsh-auto-collapse/client.js.map&rev=abc-0\n',
)
assert.equal(
  expectedComboBytes(Buffer.from('code();\n'), comboUrl).toString('utf8'),
  'code();\n;\n//# sourceMappingURL=/plugins/??dsh-auto-collapse/client.js.map&rev=abc-0\n',
)
assert.equal(
  expectedComboBytes(Buffer.from('code();\n//# sourceMappingURL=x.js.map\n'), comboUrl).toString('utf8'),
  'code();\n;\n//# sourceMappingURL=/plugins/??dsh-auto-collapse/client.js.map&rev=abc-0\n',
)

console.log('[ALL PASS] deploy combo bytes expectation')

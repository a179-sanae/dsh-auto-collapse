/**
 * 安全部署：build → 校验安装目标 → 备份 → 替换 → 仅重启已确认的 DSH web
 * 进程 → 校验服务端 bundle。任一步失败都会恢复备份并重启旧版本。
 */
import { spawn, spawnSync } from 'node:child_process'
import { createHash, createHmac } from 'node:crypto'
import net from 'node:net'
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  statSync,
  readFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))

const sleep = ms => new Promise(resolvePromise => setTimeout(resolvePromise, ms))

function sha256Bytes(value) {
  return createHash('sha256').update(value).digest('hex')
}

function sha256File(file) {
  return sha256Bytes(readFileSync(file))
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(`${command} 退出码 ${result.status}${detail === '' ? '' : `:\n${detail}`}`)
  }
  return (result.stdout ?? '').trim()
}

/**
 * 根据当前平台定位用户目录、插件安装副本和 DSH 包目录。
 * Windows 使用 USERPROFILE/APPDATA；Linux/macOS 使用 HOME，并优先从
 * npm root -g 找到全局安装的 @deepseek-ai/dsh。环境变量仍可覆盖全部路径。
 */
export function resolveDeployPaths(env = process.env, platform = process.platform) {
  const isWindows = platform === 'win32'
  const userHome = isWindows
    ? env.USERPROFILE ?? env.HOME ?? homedir()
    : env.HOME ?? homedir()
  if (userHome === undefined || userHome === '') {
    throw new Error('缺少用户主目录（HOME/USERPROFILE），无法定位 DSH 安装目录')
  }

  const appData = env.APPDATA ?? join(userHome, 'AppData', 'Roaming')
  let defaultDshDir = env.DSH_DIR
  if (defaultDshDir === undefined && isWindows) {
    defaultDshDir = join(appData, 'npm/node_modules/@deepseek-ai/dsh')
  } else if (defaultDshDir === undefined) {
    const candidates = []
    try {
      candidates.push(join(run('npm', ['root', '-g']), '@deepseek-ai/dsh'))
    } catch {
      // npm 不可用时继续尝试 Node 安装目录和常见用户级 npm 目录。
    }
    // nvm 和系统 Node 的全局包目录都可以由 process.execPath 推导出来。
    candidates.push(join(dirname(dirname(process.execPath)), 'lib/node_modules/@deepseek-ai/dsh'))
    candidates.push(join(userHome, '.npm-global/lib/node_modules/@deepseek-ai/dsh'))
    defaultDshDir = candidates.find(dir => existsSync(join(dir, 'package.json'))) ?? candidates[0]
  }

  const webPort = Number(env.DSH_WEB_PORT ?? 3080)
  if (!Number.isInteger(webPort) || webPort < 1 || webPort > 65535) {
    throw new Error(`无效 DSH_WEB_PORT: ${env.DSH_WEB_PORT ?? ''}`)
  }
  return {
    installedLibDir: env.DSH_AUTO_COLLAPSE_LIB
      ?? join(userHome, '.dsh/profiles/web/node_modules/dsh-auto-collapse/lib'),
    dshDir: defaultDshDir,
    webPort,
    logDir: env.DSH_LOG_DIR ?? join(userHome, '.dsh/logs'),
    dshHome: env.DSH_HOME ?? join(userHome, '.dsh'),
  }
}

const {
  installedLibDir: INSTALLED_LIB_DIR,
  dshDir: DSH_DIR,
  webPort: WEB_PORT,
  logDir: LOG_DIR,
  dshHome: DSH_HOME,
} = resolveDeployPaths()

function readPackageName(directory) {
  const file = join(directory, 'package.json')
  if (!existsSync(file)) throw new Error(`缺少 package.json: ${file}`)
  return JSON.parse(readFileSync(file, 'utf8')).name
}

function validateTargets() {
  const pluginRoot = dirname(INSTALLED_LIB_DIR)
  if (readPackageName(pluginRoot) !== 'dsh-auto-collapse') {
    throw new Error(`部署目标不是 dsh-auto-collapse: ${pluginRoot}`)
  }
  if (readPackageName(DSH_DIR) !== '@deepseek-ai/dsh') {
    throw new Error(`DSH_DIR 不是 @deepseek-ai/dsh: ${DSH_DIR}`)
  }
  const target = join(INSTALLED_LIB_DIR, 'client.js')
  if (!existsSync(target)) throw new Error(`安装副本不存在: ${target}`)
}

/** Windows 端口监听进程查询。 */
function listenersWindows() {
  const script = [
    `$items = Get-NetTCPConnection -LocalPort ${WEB_PORT} -State Listen -ErrorAction SilentlyContinue`,
    '$result = @()',
    'foreach ($item in $items) {',
    '  $ownerId = [int]$item.OwningProcess',
    '  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" -ErrorAction SilentlyContinue',
    '  if ($null -ne $process) {',
    '    $result += [pscustomobject]@{ pid = $ownerId; commandLine = $process.CommandLine; executablePath = $process.ExecutablePath }',
    '  }',
    '}',
    '$result | ConvertTo-Json -Compress',
  ].join('; ')
  const output = run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script])
  if (output === '') return []
  const parsed = JSON.parse(output)
  return Array.isArray(parsed) ? parsed : [parsed]
}

/** Unix 端口监听进程查询；lsof 退出码 1 表示没有匹配项。 */
function listenersUnix() {
  const result = spawnSync('lsof', [
    '-nP',
    '-a',
    `-iTCP:${WEB_PORT}`,
    '-sTCP:LISTEN',
    '-Fp',
  ], { cwd: root, encoding: 'utf8' })
  if (result.error !== undefined) {
    if (result.error.code === 'ENOENT') {
      throw new Error('未找到 lsof，Linux/macOS 部署需要安装 lsof')
    }
    throw result.error
  }
  if (result.status === 1) return []
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim()
    throw new Error(`lsof 退出码 ${result.status}${detail === '' ? '' : `:\n${detail}`}`)
  }

  const pids = [...new Set(
    (result.stdout ?? '')
      .split(/\r?\n/)
      .filter(line => /^p\d+$/.test(line))
      .map(line => Number(line.slice(1))),
  )]
  return pids.map(pid => {
    const ps = spawnSync('ps', ['-p', String(pid), '-o', 'args='], {
      cwd: root,
      encoding: 'utf8',
    })
    if (ps.error !== undefined) {
      if (ps.error.code === 'ENOENT') throw new Error('未找到 ps，无法核验 DSH web 进程')
      throw ps.error
    }
    const commandLine = ps.status === 0 ? (ps.stdout ?? '').trim() : ''
    return { pid, commandLine, executablePath: '' }
  })
}

function listeners() {
  return process.platform === 'win32' ? listenersWindows() : listenersUnix()
}

/** 停止单个已通过身份核验的进程；Unix 使用信号，Windows 继续走 PowerShell。 */
function terminateProcess(pid, force = false) {
  if (process.platform === 'win32') {
    run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `${force ? 'Stop-Process -Force' : 'Stop-Process'} -Id ${Number(pid)} -ErrorAction Stop`,
    ])
    return
  }
  try {
    process.kill(Number(pid), force ? 'SIGKILL' : 'SIGTERM')
  } catch (error) {
    // 进程可能在重查后自行退出；这等价于停止成功，不应阻塞回滚。
    if (error?.code === 'ESRCH') return
    throw error
  }
}

export function isExpectedDshWeb(processInfo, dshDir = DSH_DIR) {
  // Win32_Process.CommandLine 经 CIM 返回时可能含双反斜杠（如 npm\\node_modules），
  // 先统一为单斜杠再比对，否则合法 DSH 进程会被误判为陌生进程而拒绝停止。
  const slash = (value) => String(value ?? '').replaceAll('\\', '/').replace(/\/{2,}/g, '/').toLowerCase()
  const command = slash(processInfo.commandLine)
  // 跨平台纯字符串比对：这里不能用 resolve()——Linux 上 resolve('C:/...')
  // 会把另一平台的路径样式解析成 cwd 相对路径，导致比对永远失败
  // （CI deploy-platform.test.mjs:125；真机上 dshDir 恒为本地绝对路径，
  // 分隔符与大小写归一已由 slash() 完成）。
  const expectedDir = slash(dshDir).replace(/\/+$/, '')
  const absoluteEntry = command.includes(expectedDir) && command.includes('lib/bin.js')
  const legacyRelativeEntry = /(?:^|\s)["']?lib\/bin\.js["']?(?:\s|$)/.test(command)
  return (absoluteEntry || legacyRelativeEntry) && /\bweb\b/.test(command)
}

async function stopExpectedWeb(cookie = null) {
  const active = listeners()
  if (active.length > 0) {
    const html = await fetchHomeHtml(WEB_PORT, cookie)
    if (!html.includes('dsh-auto-collapse/client.js')) {
      throw new Error(`端口 ${WEB_PORT} 的页面不是当前 DSH profile，拒绝停止`)
    }
  }
  const unexpected = active.filter(processInfo => !isExpectedDshWeb(processInfo))
  if (unexpected.length > 0) {
    const detail = unexpected.map(processInfo => `${processInfo.pid}: ${processInfo.commandLine ?? '<unknown>'}`).join('\n')
    throw new Error(`端口 ${WEB_PORT} 被非 DSH web 进程占用，拒绝停止:\n${detail}`)
  }
  for (const processInfo of active) {
    // TOCTOU 收紧：快照到停止之间进程可能退出/被替换（pid 复用会误杀）。
    // 停止前对该 pid 重取身份复验；已消失则跳过，身份不符则拒绝。
    const current = listeners().find(p => Number(p.pid) === Number(processInfo.pid))
    if (current === undefined) continue
    if (!isExpectedDshWeb(current)) {
      throw new Error(`pid ${current.pid} 在停止前身份变化，拒绝停止: ${current.commandLine ?? '<unknown>'}`)
    }
    terminateProcess(current.pid)
  }
  for (let attempt = 0; attempt < 20 && listeners().length > 0; attempt++) await sleep(250)
  const remaining = listeners()
  for (const processInfo of remaining) {
    if (!isExpectedDshWeb(processInfo)) throw new Error(`端口 ${WEB_PORT} 的监听进程在等待期间发生变化`)
    terminateProcess(processInfo.pid, true)
  }
  // 端口「无 LISTEN 行」≠「可绑定」：旧 socket 释放可能有延迟，新进程
  // 立刻 bind 会 EADDRINUSE 并触发 DSH 重试。启动前显式等待端口可绑定。
  await waitForPortBindable(WEB_PORT, 15000)
  return active.length
}

/** 探测端口当前是否可绑定（试绑后立即释放）。 */
function portBindable(port) {
  return new Promise(resolve => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen({ port, host: '127.0.0.1' })
  })
}

async function waitForPortBindable(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (!(await portBindable(port))) {
    if (Date.now() > deadline) throw new Error(`端口 ${port} 在 ${timeoutMs}ms 内仍不可绑定`)
    await sleep(250)
  }
}

function startWeb() {
  mkdirSync(LOG_DIR, { recursive: true })
  const outLog = join(LOG_DIR, 'web.out.log')
  const errLog = join(LOG_DIR, 'web.err.log')
  const nodeBin = process.execPath
  const bin = join(DSH_DIR, 'lib/bin.js')
  // node 原生 detached spawn：windowsHide 抑制「无控制台父进程的 console 子
  // 进程新建可见控制台」的弹窗问题（等价旧 Start-Process -WindowStyle Hidden，
  // 但路径作为 argv 数组传递，无引号拼接/注入脆弱性；PS 5.1 的 Start-Process
  // 配重定向会同步等待子进程退出卡死部署，故弃用）。stdio 落日志文件，
  // 部署失败后有持久输出可排错。追加模式保留历史。
  const out = openSync(outLog, 'a')
  const err = openSync(errLog, 'a')
  try {
    const child = spawn(nodeBin, [bin, 'web'], {
      cwd: DSH_DIR,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', out, err],
    })
    child.unref()
    return child.pid ?? null
  } finally {
    closeSync(out)
    closeSync(err)
  }
}

async function fetchBytes(url, headers = {}) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers })
  if (!response.ok) throw new Error(`${url} 返回 HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}


/** 从单行日志提取该端口的 launch token；不匹配返回 null（0.1.1 日志无 token 行）。 */
export function parseLaunchTokenLine(line, port) {
  const match = String(line ?? '').match(/[?&]token=([A-Za-z0-9_-]+)/)
  if (match === null) return null
  if (!String(line).includes(`:${port}/`) && !String(line).includes(`:${port}?`)) return null
  return match[1]
}

/** 从一段日志文本找该端口最新（最后）的 launch token；没有返回 null。 */
export function findLatestLaunchToken(text, port) {
  let latest = null
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const token = parseLaunchTokenLine(line, port)
    if (token !== null) latest = token
  }
  return latest
}

/** Set-Cookie 头数组拼成 Cookie 请求头（只取 name=value 段）。 */
export function buildCookieHeader(setCookieHeaders) {
  const parts = []
  for (const header of setCookieHeaders ?? []) {
    const pair = String(header).split(';', 1)[0].trim()
    if (pair !== '') parts.push(pair)
  }
  return parts.join('; ')
}

/** base64url 编解码（cookie 自签用，不引入外部依赖）。 */
function base64UrlEncode(bytes) {
  return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** 从 DSH_HOME/.credentials.yaml 读浏览器会话签名密钥。
 *  文件/记录缺失返回 null（调用方回退到 token 交换或匿名路径）。
 */
export function readBrowserSessionSecret(dshHome) {
  let text
  try {
    text = readFileSync(join(dshHome, '.credentials.yaml'), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
  const lines = String(text).split(/\r?\n/)
  const keyIndex = lines.findIndex(line => line.trim() === 'client-connection/browser-session:')
  if (keyIndex === -1) return null
  for (let i = keyIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    // 缩进退回同级或更浅即离开该记录块。
    if (/^(\S|  \S)/.test(line)) break
    const match = line.match(/^\s*secret:\s*([A-Za-z0-9_-]+)\s*$/)
    if (match !== null) return match[1]
  }
  return null
}

/** 用持久签名密钥自签浏览器会话 cookie（0.1.2 BrowserAuth 兼容格式）。
 *  secret 缺失/非法返回 null。有效期固定 10 分钟，远小于任何合理的
 *  cookieMaxAgeDays 服务端上限，且只够 deploy 当次校验使用。 */
export function mintBrowserCookie(port, secretBase64Url) {
  let secret
  try {
    secret = Buffer.from(String(secretBase64Url ?? ''), 'base64url')
    if (secret.length !== 32) return null
  } catch {
    return null
  }
  const authority = `127.0.0.1:${port}`
  const name = `dsh-auth-${base64UrlEncode(createHash('sha256').update(authority).digest())}`
  const now = Date.now()
  const body = base64UrlEncode(Buffer.from(JSON.stringify({
    version: 1,
    authority,
    issuedAt: now,
    expiresAt: now + 600000,
  }), 'utf8'))
  const signature = base64UrlEncode(createHmac('sha256', secret).update(body).digest())
  return `${name}=v1.${body}.${signature}`
}

/** 从首页 HTML 的 __DSH_BOOT__ 图里找插件的 combo 服务地址；找不到返回 null。 */
export function findBootEntryUrl(html, pluginId) {
  const text = String(html ?? '')
  const match = text.match(/__DSH_BOOT__"\]\s*=\s*(\{.*?\})\s*;?\s*<\/script>/s)
  if (match === null) return null
  let graph
  try {
    graph = JSON.parse(match[1])
  } catch {
    return null
  }
  const entries = graph?.entries
  if (!Array.isArray(entries)) return null
  const entry = entries.find(item => item?.id === pluginId)
  return typeof entry?.url === 'string' ? entry.url : null
}

/** 按 0.1.2 client-modules 的 combo 拼装规则，本地复刻单条记录的服务端字节：
 *  去 trailer → 保底换行 → ';' + 换行 → sourceMappingURL 尾行（与 buildCombo/
 *  comboSource/comboScript 逐字对应，含随机 rev 的 map 地址由实测 bundleUrl 传入）。
 *  用于部署校验：比对“服务端实际吐出的字节”，而非构建产物裸文件。 */
export function expectedComboBytes(bundleBuffer, bundleUrl) {
  let source = Buffer.from(bundleBuffer).toString('utf8')
  source = source
    .replace(/(?:\r?\n)?\/\/# sourceURL=([^\r\n]+)(?:\r?\n)?$/, '')
    .replace(/(?:\r?\n)?\/\/# sourceMappingURL=[^\r\n]*(?:\r?\n)?$/, '')
  if (!source.endsWith('\n')) source += '\n'
  const mapUrl = String(bundleUrl).replace('client.js&rev=', 'client.js.map&rev=')
  return Buffer.from(`${source};\n//# sourceMappingURL=${mapUrl}\n`)
}

/** 用 launch token 换浏览器会话 cookie（0.1.2 鉴权模型）。
 *  成功返回可直接用作 Cookie 请求头的值；token 无效时返回 null。 */
async function exchangeCookie(port, token) {
  const url = `http://127.0.0.1:${port}/?token=${token}`
  let response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'manual' })
  } catch {
    // 端口无服务（全新部署）或连接失败：视为无会话，调用方走匿名路径。
    return null
  }
  if (response.status !== 303 && response.status !== 302) return null
  const cookies = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : []
  const header = buildCookieHeader(cookies)
  return header === '' ? null : header
}

/** 解析 web 会话 cookie：token 交换优先（精确绑定进程），持久密钥自签兜底
 *  （手动启动的旧进程等无日志 token 场景），最后回退匿名（0.1.1）。 */
async function resolveWebCookie(port, logDir, startMarker = 0) {
  const outLog = join(logDir, 'web.out.log')
  const readTail = () => {
    try {
      const data = readFileSync(outLog, 'utf8')
      return startMarker > 0 ? data.slice(startMarker) : data
    } catch (error) {
      if (error?.code === 'ENOENT') return ''
      throw error
    }
  }
  const deadline = Date.now() + (startMarker > 0 ? 15000 : 0)
  const tried = new Set()
  for (;;) {
    const token = findLatestLaunchToken(readTail(), port)
    if (token !== null && !tried.has(token)) {
      tried.add(token)
      const cookie = await exchangeCookie(port, token)
      if (cookie !== null) return cookie
    }
    if (Date.now() > deadline) {
      const secret = readBrowserSessionSecret(DSH_HOME)
      return secret === null ? null : mintBrowserCookie(port, secret)
    }
    await sleep(500)
  }
}

/** 带会话的首页抓取：cookie 优先，匿名回退（0.1.1 兼容）。 */
async function fetchHomeHtml(port, cookie) {
  const url = `http://127.0.0.1:${port}/`
  if (cookie !== null) {
    return (await fetchBytes(url, { Cookie: cookie })).toString('utf8')
  }
  return (await fetchBytes(url)).toString('utf8')
}
async function verifyServedBundle(builtPath, cookie = null) {
  // 新进程可能经 cordis 慢重试才完成端口绑定（EADDRINUSE 竞态），轮询等服务就绪
  const deadline = Date.now() + 30000
  let html
  const headers = cookie === null ? {} : { Cookie: cookie }
  for (;;) {
    try {
      html = await fetchHomeHtml(WEB_PORT, cookie)
      break
    } catch (error) {
      if (Date.now() > deadline) throw error
      await sleep(500)
    }
  }
  // 0.1.2 的 combo 服务地址含随机 rev，只能从 __DSH_BOOT__ 图里取精确 URL；
  // 0.1.1（一行式 ?rev= 哈希）走正则回退。
  let bundleUrl = findBootEntryUrl(html, 'dsh-auto-collapse')
  let expected
  if (bundleUrl === null) {
    // 0.1.1（一行式 ?rev= 哈希）：服务端吐裸文件，直接比构建产物。
    const legacy = html.match(/dsh-auto-collapse\/client\.js\?rev=([a-f0-9]+)/)
    if (legacy === null) {
      throw new Error('首页未找到 dsh-auto-collapse client 入口：插件可能在 marketplace 被禁用，或 client 未被宿主收录')
    }
    bundleUrl = `/plugins/dsh-auto-collapse/client.js?rev=${legacy[1]}`
    expected = sha256File(builtPath)
  } else {
    // 0.1.2 combo：服务端吐拼装后字节，按同规则本地复刻再比。
    expected = sha256Bytes(expectedComboBytes(readFileSync(builtPath), bundleUrl))
  }
  const bytes = await fetchBytes(
    `http://127.0.0.1:${WEB_PORT}${bundleUrl}`,
    headers
  )
  const servedHash = sha256Bytes(bytes)
  if (servedHash !== expected) throw new Error(`服务端 bundle 哈希不匹配: ${servedHash}`)
  return bundleUrl
}

async function main() {
  console.log('[1/5] 构建并校验目标')
  run(process.execPath, [join(root, 'build.mjs')])
  validateTargets()

  const built = join(root, 'lib/client.js')
  const target = join(INSTALLED_LIB_DIR, 'client.js')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backup = `${target}.backup-${stamp}`
  const expectedHash = sha256File(built)
  // 除 client.js 外还需与仓库保持一致的运行时文件：package.json 的 dsh.client.inject
  // 决定宿主向 client 注入哪些服务（缺服务则设置卡片静默不渲染），lib/index.js 是
  // 宿主半（settings 命名空间注册）。deploy 只做热同步，不触发 npm 安装。
  const extraFiles = [
    { rel: 'package.json', src: join(root, 'package.json') },
    { rel: 'lib/index.js', src: join(root, 'lib', 'index.js') },
  ]
  let replaced = []   // { target, backup } —— 失败时按序恢复

  console.log('[2/5] 备份并替换安装副本')
  copyFileSync(target, backup)
  replaced.push({ target, backup })
  for (const { rel, src } of extraFiles) {
    const dest = join(INSTALLED_LIB_DIR, '..', rel)
    if (!existsSync(dest)) continue
    const b = `${dest}.backup-${stamp}`
    copyFileSync(dest, b)
    copyFileSync(src, dest)
    replaced.push({ target: dest, backup: b })
  }
  console.log(`      备份: ${backup} 等 ${replaced.length} 个文件`)
  try {
    copyFileSync(built, target)
    if (sha256File(target) !== expectedHash) throw new Error('复制后哈希不一致')

    console.log('[3/5] 核验并停止旧 DSH web')
    // 旧进程的 launch token 在历史日志里（startMarker=0 全量扫描）；0.1.1 无 token 则走匿名。
    const oldCookie = await resolveWebCookie(WEB_PORT, LOG_DIR)
    const stopped = await stopExpectedWeb(oldCookie)
    console.log(`      已停止 ${stopped} 个已确认进程`)

    console.log('[4/5] 启动 DSH web')
    // 记录启动前日志位点：只认新进程打印的 launch token，避免误用历史 token。
    let logMarker = 0
    try {
      logMarker = statSync(join(LOG_DIR, 'web.out.log')).size
    } catch {
      logMarker = 0
    }
    const pid = startWeb()
    console.log(`      新进程 PID ${pid}`)
    await sleep(4000)

    console.log('[5/5] 验证服务端 bundle')
    const newCookie = await resolveWebCookie(WEB_PORT, LOG_DIR, logMarker)
    const servedUrl = await verifyServedBundle(built, newCookie)
    console.log(`      url=${servedUrl} sha256=${expectedHash.slice(0, 12)}...`)
    console.log('\n部署完成；浏览器刷新后生效。')
  } catch (error) {
    console.error(`\n部署失败: ${error instanceof Error ? error.message : String(error)}`)
    if (replaced.length > 0) {
      console.error('正在恢复备份并重启旧版本...')
      for (const { target: t, backup: b } of replaced) copyFileSync(b, t)
      try {
        const rollbackCookie = await resolveWebCookie(WEB_PORT, LOG_DIR)
        await stopExpectedWeb(rollbackCookie)
        startWeb()
        await sleep(2000)
        console.error('旧 bundle 已恢复。')
      } catch (rollbackError) {
        console.error(`回滚后重启失败: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`)
      }
    }
    process.exitCode = 1
  }
}

// 导入本文件时只提供路径解析能力，不触发构建、复制或重启；直接执行时才部署。
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}

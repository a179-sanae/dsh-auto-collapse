/**
 * 安全部署：build → 校验安装目标 → 备份 → 替换 → 仅重启已确认的 DSH web
 * 进程 → 校验服务端 bundle。任一步失败都会恢复备份并重启旧版本。
 */
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import net from 'node:net'
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
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
  }
}

const {
  installedLibDir: INSTALLED_LIB_DIR,
  dshDir: DSH_DIR,
  webPort: WEB_PORT,
  logDir: LOG_DIR,
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

function isExpectedDshWeb(processInfo) {
  const command = String(processInfo.commandLine ?? '').replaceAll('\\', '/').toLowerCase()
  const expectedDir = resolve(DSH_DIR).replaceAll('\\', '/').toLowerCase()
  const absoluteEntry = command.includes(expectedDir) && command.includes('lib/bin.js')
  const legacyRelativeEntry = /(?:^|\s)["']?lib\/bin\.js["']?(?:\s|$)/.test(command)
  return (absoluteEntry || legacyRelativeEntry) && /\bweb\b/.test(command)
}

async function stopExpectedWeb() {
  const active = listeners()
  if (active.length > 0) {
    const html = (await fetchBytes(`http://127.0.0.1:${WEB_PORT}/`)).toString('utf8')
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

async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`${url} 返回 HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function verifyServedBundle(expectedHash) {
  // 新进程可能经 cordis 慢重试才完成端口绑定（EADDRINUSE 竞态），轮询等服务就绪
  const deadline = Date.now() + 30000
  let html
  for (;;) {
    try {
      html = (await fetchBytes(`http://127.0.0.1:${WEB_PORT}/`)).toString('utf8')
      break
    } catch (error) {
      if (Date.now() > deadline) throw error
      await sleep(500)
    }
  }
  const match = html.match(/dsh-auto-collapse\/client\.js\?rev=([a-f0-9]+)/)
  if (match === null) throw new Error('首页未找到 dsh-auto-collapse client 入口')
  const bytes = await fetchBytes(
    `http://127.0.0.1:${WEB_PORT}/plugins/dsh-auto-collapse/client.js?rev=${match[1]}`,
  )
  const servedHash = sha256Bytes(bytes)
  if (servedHash !== expectedHash) throw new Error(`服务端 bundle 哈希不匹配: ${servedHash}`)
  return match[1]
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
    const stopped = await stopExpectedWeb()
    console.log(`      已停止 ${stopped} 个已确认进程`)

    console.log('[4/5] 启动 DSH web')
    const pid = startWeb()
    console.log(`      新进程 PID ${pid}`)
    await sleep(4000)

    console.log('[5/5] 验证服务端 bundle')
    const revision = await verifyServedBundle(expectedHash)
    console.log(`      rev=${revision} sha256=${expectedHash.slice(0, 12)}...`)
    console.log('\n部署完成；浏览器刷新后生效。')
  } catch (error) {
    console.error(`\n部署失败: ${error instanceof Error ? error.message : String(error)}`)
    if (replaced.length > 0) {
      console.error('正在恢复备份并重启旧版本...')
      for (const { target: t, backup: b } of replaced) copyFileSync(b, t)
      try {
        await stopExpectedWeb()
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

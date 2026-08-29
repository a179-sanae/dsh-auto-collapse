/** deploy-platform.test.mjs —— 验证部署脚本的平台路径选择不会依赖 Windows 环境变量。 */
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { resolveDeployPaths } from '../deploy.mjs'

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

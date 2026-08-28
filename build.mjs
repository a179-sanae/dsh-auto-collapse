/**
 * dsh-auto-collapse 构建脚本。
 *
 * 产出：
 *   lib/index.js   —— host half（由 src/index.ts 自动生成）
 *   lib/client.js  —— browser bundle：自包含 iife，执行时向
 *                     window.__ModuleLoader__.load({ id, factory }) 注册。
 *   lib/types/*    —— 由 TypeScript 自动生成的入口与依赖声明文件。
 *
 * 构建器：本地 devDependency esbuild（JS API）。不用 spawn CLI：Windows 下
 * 经 shell 传 banner/footer 这类含引号与括号的参数会被 cmd 拆坏。
 */
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const require = createRequire(import.meta.url)

const CLIENT_OPTIONS = {
  entryPoints: ['src/client.ts'],
  bundle: true,
  format: 'iife',
  globalName: '__dshcfBundle',
  platform: 'browser',
  target: 'es2020',
  outfile: 'lib/client.js',
  external: ['react'],
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-auto-collapse",factory:function(require){' },
  footer: { js: 'return __dshcfBundle;}});' },
}

/** Host 半保持 ESM 输出，依赖由 DSH profile 在运行时提供。 */
const HOST_OPTIONS = {
  entryPoints: ['src/index.ts'],
  bundle: false,
  format: 'esm',
  platform: 'node',
  target: 'es2020',
  outfile: 'lib/index.js',
}

/** 由 TypeScript 自动生成所有公开入口及其依赖的声明文件。 */
function buildTypes() {
  const tsc = require.resolve('typescript/bin/tsc')
  execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json'], { stdio: 'inherit' })
}

console.log('[dsh-auto-collapse] building lib/client.js …')
try {
  const esbuild = require('esbuild')
  await esbuild.build(CLIENT_OPTIONS)
  await esbuild.build(HOST_OPTIONS)
  buildTypes()
} catch (error) {
  if (error?.code === 'MODULE_NOT_FOUND') {
    throw new Error(
      '[dsh-auto-collapse] esbuild is a devDependency of this package; run `npm install` first',
      { cause: error },
    )
  }
  throw error
}
console.log('[dsh-auto-collapse] done: lib/client.js')

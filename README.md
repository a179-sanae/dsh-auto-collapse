# dsh-auto-collapse

> DSH Web 工作段折叠：保留原生一级，把正文之间的思考、工具和上下文合成一个二级；展开后显示原生三级。
>
> [English](README.en.md) · [插件市场](https://www.dsh.so/artifact/dsh-auto-collapse/)

## 展示方式

```text
正文 A
▸ 已思考 · 使用了浏览器 · 已注入上下文 · 编辑了文件
正文 B
▸ 正在运行 npm run check
正文 C
```

每段只有一个二级入口。思考变成工具调用、工具后追加上下文，都继续归入当前段；新正文出现后，后续工作另起一段。只有思考、只有上下文或单条工具也可以成段。

- **一级：DSH 原生回合摘要。** 完成判断、计数、过程正文与最终回答由宿主负责。
- **二级：插件工作段。** 工作中可见，展开原生一级后也保留；默认收起，流式追加保持手动展开意图。
- **三级：原生工作行。** 二级展开后按原顺序展示思考、工具、上下文；每行自己的详情开合保持原样。

![混合工作段示例](assets/screenshot.png)

预览来自浏览器验收场景，使用 DSH 0.1.2-rc.1 原生 disclosure、思考和回合摘要组件。

## 行为

正文是分组边界，同一 `assistant-step` 内的“思考—正文—思考”也会切开；Markdown 换行不拆组。纯图片、SVG 和其他正文内容保持原生展示。用户消息、steering、不同 turn 和未知语义节点不会被跨越。

原生一级收起时，受它控制的二级入口一起隐藏，但二级状态保留。若上下文位于原生折叠范围之外，仍保留可访问的二级入口；点击展开会按需打开原生一级。Normal 模式没有原生一级时，二级仍生效。

系统提示词也归入相邻的上下文工作段。有明确回合归属时，它跟随原生一级收起；一级展开后先显示二级，展开二级才显示系统提示词的原生行，详情开关保持原样。

工作摘要显示已发生的动作类型和当前运行信息，不复制推理全文。查找隐藏内容时通过 `hidden="until-found"` / `beforematch` 展开所属层级。选中、焦点和需要用户输入的工作保持可达。HMR、切换会话或异常恢复会释放插件控制。

设置 → 插件 → 插件配置仍可编辑“状态提示词”，默认 `Deep sleeping...`。保存空值恢复官方文字；用时后缀保留。该功能独立于分组，服务晚到或重连不会影响二级。

## 兼容性与升级

| 插件 | 验证的 DSH |
|---|---|
| 0.2.x | 0.1.2-rc.1；浏览器验收含该版本原生组件 |
| 0.1.8 | 0.1.2-rc.1，旧折叠实现 |
| ≤ 0.1.6 | 0.1.1.x |

0.2.0 完全重写了折叠核心。升级后保留并统一二级，删除自建“已处理 X秒”一级行和三级推理全文副本；上下文不再单独拆成二级。旧 `statusText` 配置继续使用。未知 DOM 节点保留原生展示，其他宿主版本需要另行验证。

## 安装

已发布版本可用：

```bash
dsh plugin --profile web add dsh-auto-collapse
```

从源码安装时，先生成完整安装包，再安装命令输出的 tgz：

```bash
npm ci
npm run package
dsh plugin --profile web add <生成的-tgz-绝对路径>
```

安装后按宿主方式重载插件或重启 Web，再刷新页面。回退时安装完整旧版包，例如 `dsh-auto-collapse@0.1.8`。

`npm run package` 与兼容别名 `npm run deploy` **只构建 tgz**，不再逐文件覆盖安装目录、读取凭据或自动停止/启动 DSH。

## 开发与验证

Node.js 22+。首次浏览器验证需要 Playwright Chromium；Windows 可自动使用已安装的 Chrome/Edge，也可通过 `DSH_TEST_BROWSER` 指定可执行文件。

```bash
npm ci
npx playwright install chromium
npm run check
```

Linux CI 使用 `npx playwright install --with-deps chromium` 安装浏览器依赖。

```bash
npm run test:unit       # 纯分组、身份、状态摘要
npm run test:browser    # 当前构建的真实浏览器验收
npm run preview        # 本地合成场景：http://127.0.0.1:43190
npm run package        # artifacts/ 下完整 tgz
```

修改源码后先 `npm run build` 再单独运行浏览器测试或刷新预览。`npm run check` 自动执行 typecheck、构建、单元测试、浏览器测试和安装包检查。

浏览器测试使用真实 React、原生组件快照和当前发布 bundle，覆盖混合分组、同消息正文边界、原生一级、详情状态、搜索、焦点、SVG、异常恢复、设置生命周期及 100/1,000/5,000 个历史节点。完整测试还包含 30 秒无轮询检查。fixture 不依赖用户会话或凭据；完整后端部署不在隔离 fixture 的验证范围内。

## 代码结构

| 文件 | 职责 |
|---|---|
| `src/work-model.ts` / `host-contract.ts` | 识别正文边界和原生工作项，缓存宿主结构 |
| `src/work-groups.ts` / `summary.ts` | 纯分组规则、稳定身份、二级展开意图和动作摘要 |
| `src/dom-view.ts` / `styles.css` | 唯一二级入口、受限显隐、恢复和样式 |
| `src/controller.ts` / `scheduler.ts` | 脏工作段协调、原生一级联动、生命周期 |
| `src/status-text.ts` / `settings.ts` | 独立状态文案及设置卡 |
| `src/client.ts` / `index.ts` | 客户端与宿主接线 |

不修改消息内容，不移动原生节点，不接管原生 renderer，不推断 final，不扫描“空 div”，不回写主滚动容器。

## 许可

MIT。测试中的原生组件快照保留 DeepSeek 的 MIT 许可。

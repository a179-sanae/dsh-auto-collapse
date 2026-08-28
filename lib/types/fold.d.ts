/**
 * FoldController —— dsh-auto-collapse 的核心。
 *
 * 把会话流（[data-chat-flow]）里的“非正文 display”折叠成内联的一行，
 * 折叠行实时显示**当前正在进行的工作**（与 Codex 对齐）：
 *
 *   - 块里有运行中的工具调用 → 标题 = "Running" + 工具名（Bash/Read/
 *     Search…，读 data-tool），摘要 = 正在执行的命令/路径/查询（读工具
 *     卡片的 summary 行）；标题与摘要带平滑呼吸动画（Pulse）。
 *   - 块里正在思考（think running）→ 标题 = "Thinking"，摘要 = 思考的
 *     最新一行（读 [data-follow-end]，官方 ReasoningRow 的实时摘要锚点）。
 *   - 全部完成 → 标题 = 类型总结（编辑了文件 / 运行了命令 / 已思考 /
 *     上下文注入），摘要清空；出错 → 红色，中断 → 琥珀。
 *
 * 另外把官方 ChatView 尾部的运行状态行文字 "Deep diving..." 替换为
 * 可配置的状态提示词（默认 "Deep sleeping..."；流光特效在 CSS 上，
 * 替换文本节点不影响）。React 重渲染会恢复原文，pass() 每轮自愈改回。
 * 设置为空时不替换，等价于恢复官方 "Deep diving..."。
 *
 * 点击一行展开，再点收起；折叠态下若有行被选中（详情联动）自动展开。
 *
 * 折叠规则（沿用 dsh-web-archive 验证过的算法）：每个回合合成一块——
 * 某条消息的 Think 推理组与其后紧跟的工具组合并成一块（只有 think 或
 * 只有工具组时各自成块），在块宿主**原位**插入 chip；带正文文本的消息
 * 断开合并。结构保持 文本a - [折叠块] - 文本b - 文本c。
 *
 * 与 React 的关系：chip 插入 React 管理的 flow 子树内，但只做前置插入与
 * style.display 切换（React 的 vdom diff 不会感知也不会清除 CSSOM 上的
 * 手动样式）；MutationObserver 每轮把结构变化合并到一次
 * requestAnimationFrame 里重放（自愈：React 重渲染、切换会话、流式新
 * 卡片都会自动跟上）。
 *
 * 零核心改动：不修改任何 slot 注册，不依赖任何 client 服务。
 */
export declare class FoldController {
    private observer;
    /** 防止同一个控制器重复注册 observer、定时器和可见性监听。 */
    private started;
    /** body 尚未创建时等待 DOMContentLoaded，再补一次启动。 */
    private waitingForBody;
    private readonly onDomContentLoaded;
    private raf;
    private timer;
    private disposed;
    private lastPassError;
    private flow;
    /** 稳定 block key → 当前 React 渲染中的 chip/host。 */
    private chips;
    private currentBlocks;
    private blockExpanded;
    /** host → 三级合并思考行（展开二级后连续思考合并显示为一个三级行）。 */
    private mergedThinks;
    /** 合并思考行的展开状态（true = 显示合并内容块）。 */
    private mergedExpanded;
    /** 合并内容缓存（首次从原生行读取后保存，pass 重建内容块时不再重新展开原生行）。 */
    private mergedBodyTexts;
    /** 合并行标题缓存（原生行展开态提取不到摘要时保持首次标题，不丢成“思考”）。 */
    private mergedTitles;
    /** 稳定 segment key → 一级折叠行与展开状态。 */
    private segmentStates;
    /** segment 首次观察到 running 的时间，用于没有官方时长的实时回合。 */
    private runningSince;
    /** 曾完成过的 segment key：段恢复运行时据此重开本地计时，防止重新结算
     * 的本地时长吞掉完成间隙。 */
    private completedOnce;
    /** 插件改写 display 前的精确原值；受控集合用于分类漂移和 stop() 恢复。 */
    private originalDisplay;
    private controlledDisplay;
    /** 元素 → 插件最后确保的 display 值：恢复前与当前内联值比对，漂移即视为
     * 外部介入（镜像 turnStatusTexts 的 original/written 双快照守卫，issue #11）。 */
    private writtenDisplay;
    /** 被改写为状态提示词的原生状态文本：original = 宿主原文（卸载还原用），
     * written = 插件最后一次写入的值（仅当节点仍等于它时才还原，避免覆盖
     * 宿主在插件写入之后的状态更新）。 */
    private turnStatusTexts;
    /** 当前状态提示词读取器；返回空串时插件不替换状态行。 */
    private statusTextProvider;
    /** 正文判定缓存（消息元素 → 有无正文）：流式期间只有被 mutation 命中的
     * 消息失效重算，历史消息跨 pass 复用，避免每帧全量 TreeWalker。 */
    private bodyTextCache;
    /** 自上次 pass 以来子树发生变化的 flow 顶层消息；pass 开头统一失效。 */
    private dirtyMessages;
    /** 在途显示动画（元素 → 记录）：冲突仲裁、记账对齐与生命周期清理的依据。
     * 用 Map 不用 WeakMap——switchFlow/stop 需要遍历全量 cancel。 */
    private pendingAnims;
    /** 手势点击的一次性可动画 block key；segment 级点击另保留中间正文的门控。 */
    private animatableKeys;
    /** segment 点击时只让点击前已存在的 block 播放 reveal；流式中新出现的
     * 临时分裂块直接显示，避免分类收敛时留下半透明 stale chip。 */
    private animatableSegmentBlocks;
    /** 外部变更对账定时器句柄（自重排 setTimeout 链，见 armAuditLoop）。 */
    private auditTimer;
    /** 回到前台立即补一轮对账；后台 tab 由 document.hidden 门控跳过。 */
    private readonly onVisibilityChange;
    constructor(statusTextProvider?: () => string | undefined, options?: {
        auditIntervalMs?: number;
    });
    private readonly auditIntervalMs;
    /** 设置变更后重跑一轮，让状态提示词立即生效。 */
    refresh(): void;
    start(): void;
    /** 外部显示变更对账循环（issue #11 Bug B）：外部对宿主行的 style 写入不产生
     * observer record（style 不在 attributeFilter 内，监听会因插件自身直写 style
     * 自激），改用低频自重排兜底——任何外部隐藏/恢复最迟一个周期被 pass 收敛；
     * 后台 tab 由 document.hidden 门控跳过，回前台由 visibilitychange 立即补一轮。
     * 用自重排 setTimeout 链而非 setInterval：与 schedule 的兜底定时器同源，
     * 测试桩 clearTimers 后链条自然熄灭。 */
    private armAuditLoop;
    private rearmAudit;
    stop(): void;
    /** body 级 observer 只负责发现 flow 替换；已有 flow 外的文本变化不再触发全量扫描。 */
    private shouldSchedule;
    /** 记录本批 mutation 命中的 flow 顶层消息，供正文判定缓存定向失效。
     * 从 record.target 沿 parentNode 走到 flow 的直接子级即所属消息；
     * 归属不到单一顶层消息（flow 直挂层结构变化、flow 外节点、文本直接
     * 子节点）时全量失效——保守正确且罕见。 */
    private markDirty;
    private schedule;
    /** 异步 observer 异常不能静默杀死协调器；保留非可视诊断并允许后续 mutation 重试。 */
    private runPass;
    private reportError;
    /** 一轮重放：重算堆积 → 应用折叠/展开 → 摆放并更新 chip → 替换状态行。 */
    private pass;
    /** flow 元素变化即视为会话切换：完整恢复旧 flow，再从新 DOM 重建。 */
    private switchFlow;
    private createProcessedRow;
    private syncProcessedRow;
    private placeProcessedRow;
    private reconcileBlock;
    private ensureChip;
    private suppressBlock;
    private retainDisplayControl;
    private cleanupStaleChips;
    /** 连续思考合并行：插在第一个思考行前，标题用第一行思考内容；
     * 点击切换显示/隐藏全部原始思考行。 */
    private syncMergedThink;
    /** 展开合并行：直接读各思考行文本合成内容块（不依赖原生行展开：
     * 程序化 click 不触发 React 展开，且后台 tab 的 rAF 不执行）。
     * 返回是否成功——思考行已不可读（parts 为空）时返回 false，调用方
     * 据此保持收起态，避免展开状态与内容块脱节。 */
    private expandMergedBody;
    /** 创建/更新合并内容块（缓存优先，不重新展开原生行）。
     * 返回内容块与其是否为本次新建（新建才走展开动画）。 */
    private ensureMergedBody;
    /** 清理合并 think 行（v12）：状态 map 立即清除；DOM 在手势动画路径下
     * 渐隐后移除（settle 回调），其余路径瞬删。渐隐中途被反向取消时元素
     * 保留，由后续 pass 的 syncMergedThink 重建/复用。
     * settle 透传给每个渐隐目标的移除回调之后（chip 间距钉住的结算探测点，
     * AI 评审 P0：merged 行渐隐不走 block.rows，必须纳入同一钉住体系）。 */
    private releaseMergedThink;
    /** merged-body 展开高度动画（机制样板：插件全资 DOM）。
     * 关键帧含 marginBottom 0→16px——其 CSS 有常量 margin-bottom:16px，
     * 高度从 0 起步时这 16px 会先占位产生小跳变。fill:'forwards' 托住终态，
     * onfinish 清内联后 cancel 释放，无闪烁窗口。收起由 collapseMergedBody
     * 做镜像高度卷下（同款账本与身份守卫），开合对称。 */
    private revealMergedBody;
    /** 收起合并行：内容块高度卷下后移除——镜像 revealMergedBody 的唯一几何动画，
     * 开合对称。插件全资静态文本 DOM、无 React 协调竞争，可安全做几何收起
     * （与 seat 级拒绝盲卷的场景不同：那里是 React 混杂多卡片）。
     * reduced-motion / 无 WAAPI / 零高度降级为同步 remove()。 */
    private collapseMergedBody;
    /** 当前宿主内的思考行（现取，React 重渲染后引用仍然有效）。 */
    private currentThinkRows;
    /** 移除合并思考行（二级收起 / 一级收起时），恢复行由 applyRows 控制。
     * 合并内容块（btn 的兄弟节点）一并移除，避免宿主展开后残留文本。 */
    private removeMergedThink;
    /** 正文判定（带缓存）：同一消息子树未变时直接复用上次结果。失效由
     * markDirty（mutation 定向）与 switchFlow（整体重置）驱动；缓存的是
     * 纯文本/媒体存在性判定，与 display 状态无关，插件自身的显隐切换
     * 不会产生脏数据。 */
    private hasBodyCached;
    /** 本块是否有在途收起渐隐（rows/containers/merged 行/body 任一）。
     * 基于 pendingAnims 账本无状态判定：onfinish/oncancel 都会即时清账，
     * 取消路径天然解锁（计数器/最后注册者会卡死）。merged 行渐隐时已被
     * releaseMergedThink 摘出 mergedThinks，按 DOM 类名现查。 */
    private hasPendingCollapse;
    /** 钉住 chip 与首行的 16px 间距（收起 fade 期间；内联优先于 aria=false 的 0）。
     * flow-chip（context 等 before-mounted）豁免：其间距由宿主 row-gap 16px
     * 提供、自身 CSS 恒 0，钉住 16px 会叠加成 32px（真机实测：收起上下文
     * 注入时二级与三级间距瞬间扩大）。
     */
    private pinChipMargin;
    /** 解除钉住（aria=true 的 16px 或 aria=false 的 0 由 CSS 接管）。 */
    private unpinChipMargin;
    /** 外部介入检测（issue #11 Bug A）：当前内联值 ≠ 插件最后确保值，或所有权
     * 哨兵被 style 整体改写抹除。返回 true 时调用方放弃本次写回并交还账本——
     * 属性级改写由值比对捕获，整体改写（cssText / setAttribute('style')）由
     * 哨兵缺失捕获，两层合起来覆盖外部介入的两种形态。 */
    private displayForeign;
    /** 清空单个元素的显示账本（三账本 + 所有权哨兵）。 */
    private releaseDisplayLedger;
    /** 返回 true 表示启动了渐隐动画（调用方可据此决定内部元素的处置）。
     * settle 在渐隐自然结束时调用（onfinish 链；反向取消不触发）。 */
    private hideElement;
    private restoreElement;
    /** 是否可动画：WAAPI 特性检测 + reduced-motion 门控（均做 typeof 防桩缺失）。 */
    private canAnimate;
    /** 展开方向淡入（opacity + 4px 微位移）：无高度分量、零布局读取。
     * onfinish 按终态可见对齐账本（双删除）并 schedule() 幂等重同步；
     * oncancel 只做身份守卫删除——取消方的终态写入自己负责。 */
    private startReveal;
    /** 同步取消在途动画并清账：收起动画需同时清锁高内联（height/overflow/
     * marginBottom），否则取消方写完终态后元素仍被锁高裁剪一帧以上。 */
    private cancelPendingSync;
    private clearCollapseLock;
    /** 祖先 seat 在途动画检测：沿 parentNode 走到 flow，任一祖先在 pendingAnims
     * 即视为在途。分层规则——同一视觉变化只动画一层。 */
    private hasAnimatingAncestor;
    /** 收起方向渐隐动画（v11 定稿）：镜像 reveal 的 opacity + 4px 微位移，
     * 淡完 onfinish 写 display:none 并保持双条目（镜像 hideElement 终态契约）。
     * fill:'forwards' 占位到终态写入后释放；无几何锁、无 gap 补偿。 */
    private startFadeCollapse;
    /** 轻量视觉 reveal（opacity + 4px 微位移）：用于插件全资元素的即时显示
     * 路径——chip（一级展开时出现）与 merged-think 行（二级展开时出现）。
     * 这些元素的 display 完全由插件直写、无 React 协调竞争，因此不入
     * pendingAnims 账本、无仲裁；收起同为直写 display:none，无 fill 的在途
     * 动画残留在隐藏元素上自然失效。门控沿用 animate 布尔（手势路径才调）。 */
    private revealVisual;
    private restoreUnusedDisplays;
    private restoreAllDisplays;
}

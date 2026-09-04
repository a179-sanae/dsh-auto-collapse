window.__ModuleLoader__.load({id:"dsh-auto-collapse",factory:function(require){
"use strict";
var __dshcfBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name2 in all)
      __defProp(target, name2, { get: all[name2], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client.ts
  var client_exports = {};
  __export(client_exports, {
    apply: () => apply,
    inject: () => inject,
    name: () => name
  });

  // src/fold.ts
  var STYLE_ID = "dshcf-style";
  var DEFAULT_STATUS_TEXT = "Deep sleeping...";
  var TURN_STATUS_COPY_RE = /Deep diving[.…]*|深度求索中\s*[.…]*/;
  var ANIM_DURATION_MS = 180;
  var ANIM_EASING = "ease-out";
  var DISPLAY_OWNED_PROP = "--dshcf-display-owned";
  var AUDIT_TICK_MS = 1e3;
  var STICK_BOTTOM_THRESHOLD_PX = 24;
  var TOOL_LABELS = {
    bash: "Bash",
    pwsh: "Pwsh",
    read: "Read",
    web_fetch: "Read",
    web_search: "Search",
    grep: "Search",
    glob: "Search",
    write: "Write",
    edit: "Edit",
    run_code: "Code",
    cordis_package_inspect: "Inspect",
    cordis_runtime_inspect: "Inspect",
    cordis_run: "Run",
    cordis_stop: "Stop",
    cordis_undefine: "Remove"
  };
  var TURN_PROCESS_KIND = "turn-process";
  var NATIVE_OPEN_ATTR = "data-open";
  var CHIP_CSS = `
.dshcf-chip {
  box-sizing: border-box;
  display: flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  min-height: 24px;
  /* chip \u63D2\u5728\u5757\u5BBF\u4E3B\uFF08flowItem\uFF09\u5185\uFF0C\u4EAB\u53D7\u4E0D\u5230\u884C\u7684 row-gap 16px\uFF1B
     \u5C55\u5F00\u6001\u8865 margin-bottom \u5BF9\u9F50\u884C\u95F4\u8282\u594F\uFF1B\u6536\u8D77\u6001\u884C\u5DF2\u9690\u85CF\uFF0C\u82E5\u4ECD\u8865
     margin \u4F1A\u4E0E\u5757\u95F4 gap \u53E0\u52A0\u6210 32px\uFF0C\u6240\u4EE5\u6536\u8D77\u6001\u4E3A 0\u3002 */
  margin-bottom: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
  text-align: left;
  cursor: pointer;
  user-select: none;
  /* \u5C55\u5F00\u6001\u8865\u7684 margin-bottom 16px \u7531 aria-expanded/has-body \u7FFB\u8F6C\u9A71\u52A8\uFF0C
     \u4E00\u5E27\u77AC\u5F00\uFF08\u4E0E\u4E09\u7EA7\u884C display \u7FFB\u8F6C\u540C pass \u540C\u5E27\uFF0C\u65E0\u4E0B\u63A8\uFF09\uFF1B\u6536\u8D77\u65B9\u5411
     \u7531 JS \u4FA7\u9489\u4F4F\u95F4\u8DDD\uFF08\u6536\u8D77 fade \u671F\u95F4\u5185\u8054 16px\uFF0C\u6700\u540E\u4E00\u6761\u5728\u9014\u6E10\u9690 settle
     \u540E\u5F52\u96F6\uFF0C\u89C1 reconcileBlock / hasPendingCollapse\uFF09\u3002\u4E0D\u8BBE CSS transition
     \u2014\u2014v13 \u7684\u8FC7\u6E21\u4E0E chip \u5143\u7D20\u751F\u547D\u5468\u671F\u968F\u673A\u4EA4\u4E92\uFF0C\u4EA7\u751F\u5C55\u5F00\u65B9\u5411\u53CC\u91CD\u4EBA\u683C
     \uFF08\u590D\u7528\u5143\u7D20\u7F13\u52A8\u4E0B\u63A8\u4E09\u7EA7\u884C vs \u65B0\u5EFA\u5143\u7D20\u77AC\u5F00\uFF09\uFF0C\u540C\u7C7B\u578B\u5757\u4E0D\u4E00\u81F4\u3002 */
}
.dshcf-chip[aria-expanded="true"],
.dshcf-chip.dshcf-has-body {
  margin-bottom: 16px;
}
/* context \u7B49 before-mounted chip \u662F flow \u7684\u76F4\u63A5\u5B50\u9879\uFF0C\u5DF2\u7ECF\u4EAB\u53D7\u5BBF\u4E3B
   row-gap: 16px\uFF1B\u5C55\u5F00\u65F6\u4E0D\u80FD\u518D\u53E0\u52A0\u81EA\u8EAB margin\uFF0C\u5426\u5219\u4E8C\u7EA7\u5230\u4E09\u7EA7\u4F1A\u53D8 32px\u3002 */
.dshcf-chip.dshcf-flow-chip {
  margin-bottom: 0;
}
.dshcf-chip:hover {
  background: transparent;
}

/* leading\uFF1A\u56FA\u5B9A 14x14\uFF08\u601D\u8003\u5757 = \u539F\u751F think \u56FE\u6807\uFF1B\u5DE5\u5177\u5757 = \u539F\u751F command
   \u56FE\u6807 IconApiOutline14\uFF0C\u514B\u9686\u81EA\u771F\u5B9E GenericCommandCard leading\uFF0C\u627E\u4E0D\u5230\u65F6
   \u9000\u56DE\u7EC8\u7AEF\u5C0F\u65B9\u5757\uFF09\uFF0C\u884C\u9AD8 24px \u4E0E\u539F\u751F\u884C\u5BF9\u9F50\uFF1B\u8FD0\u884C\u4E2D\u8DF3\u52A8\u3002svg \u5C3A\u5BF8\u7531\u5404\u81EA
   width/height \u5C5E\u6027\u51B3\u5B9A\uFF08command 14x14\u3001think 14x14\u3001\u7EC8\u7AEF 12x10 \u515C\u5E95\uFF09\uFF0C
   \u4E0D\u5728\u6B64\u5904\u5F3A\u5236\u3002 */
.dshcf-chip .dshcf-leading {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}
.dshcf-chip .dshcf-leading svg {
  display: block;
  color: var(--dsw-alias-label-tertiary);
}
.dshcf-chip.running .dshcf-leading svg {
  /* \u8FD0\u884C\u8272\u4FDD\u7559\uFF1B\u56FE\u6807\u8DF3\u52A8\u52A8\u753B\u5DF2\u6309\u7528\u6237\u8981\u6C42\u79FB\u9664\u3002 */
  color: var(--dsw-static-deepseek-500, #4d6bfe);
}

/* \u8FD0\u884C\u6307\u793A\u4E09\u4E2A\u70B9\uFF1A\u5DF2\u6309\u7528\u6237\u8981\u6C42\u79FB\u9664\uFF08\u4E0D\u518D\u521B\u5EFA/\u663E\u793A\uFF09\u3002 */

/* \u51FA\u9519\u7EA2 / \u4E2D\u65AD\u7425\u73C0\uFF08\u9759\u6B62\u6001\uFF09\u3002 */
.dshcf-chip.error:not(.running) .dshcf-leading svg {
  color: var(--dsw-alias-state-error-primary, #e5484d);
}
.dshcf-chip.stopped:not(.running) .dshcf-leading svg {
  color: var(--dsw-alias-state-warning-primary, #f5a524);
}

.dshcf-chip .dshcf-chip-title {
  flex: none;
  font-weight: 400;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshcf-chip .dshcf-chip-sep {
  flex: none;
  width: 2px;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-label-caption, rgba(127, 127, 127, 0.5));
}
/* \u6458\u8981\u4E0D\u6491\u6EE1\uFF08flex 0 1\uFF09\uFF0C\u8BA9 chevron \u7D27\u8DDF\u5728\u6587\u672C\u53F3\u65B9\u800C\u975E\u884C\u5C3E\u3002 */
.dshcf-chip .dshcf-chip-summary {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* running \u6458\u8981\uFF1A\u8DDF\u968F\u6EDA\u52A8\u663E\u793A\u6700\u65B0\u5185\u5BB9\uFF08text-overflow: clip\uFF0C\u539F\u751F\u540C\u6B3E\uFF09\u3002 */
.dshcf-chip.running .dshcf-chip-summary {
  text-overflow: clip;
}
/* \u6298\u53E0\u884C\u6587\u5B57\uFF1A\u590D\u7528 DSH \u539F\u751F label token\uFF08\u5DE5\u5177\u884C\u540C\u6E90\uFF09\uFF0C\u533A\u522B\u4E8E\u6B63\u6587\u7EAF\u767D\u3002 */
.dshcf-chip .dshcf-chip-title {
  color: var(--dsw-alias-label-primary);
}
.dshcf-chip .dshcf-chip-summary {
  color: var(--dsw-alias-label-tertiary);
}
/* \u5DE5\u5177\u884C\u6458\u8981\uFF08\u547D\u4EE4/\u8DEF\u5F84\uFF09\u7B49\u5BBD\u5B57\u4F53 + \u4EE3\u7801\u886C\u5E95\uFF08\u7D20\u6750 Codex \u540C\u6B3E\uFF09\u3002
   \u884C\u9AD8\u4E0E chip \u4E00\u81F4\uFF0824px\uFF09\uFF0C\u6D41\u5F0F\u66F4\u65B0\u65F6\u6458\u8981\u5355\u884C ellipsis \u4E0D\u6362\u884C\u4E0D\u6491\u9AD8\u3002 */
.dshcf-chip[data-kind="tool"] .dshcf-chip-summary {
  font-family: ui-monospace, SFMono-Regular, Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 24px;
  background: rgba(127, 127, 127, 0.14);
  border-radius: 4px;
  padding: 0 6px;
}
.dshcf-chip[data-kind="tool"] .dshcf-chip-summary:empty {
  background: none;
  padding: 0;
}

/* \u8FD0\u884C\u4E2D\u6587\u5B57\u4F7F\u7528\u5E73\u6ED1\u547C\u5438\u52A8\u753B\uFF08Pulse\uFF09\uFF0C\u9002\u914D\u6D45\u8272/\u6DF1\u8272\u4E3B\u9898\uFF0C\u907F\u514D background-clip \u88C1\u5207\u95EE\u9898\u3002 */
.dshcf-chip.running .dshcf-chip-title,
.dshcf-chip.running .dshcf-chip-summary {
  color: var(--dsw-alias-label-tertiary, #8b8f99);
  -webkit-text-fill-color: currentColor;
  animation: dshcf-pulse 1.6s ease-in-out infinite;
}
.dshcf-chip.running[data-kind="tool"] .dshcf-chip-summary {
  background: transparent;
}
@keyframes dshcf-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* "\u5DF2\u5904\u7406"\u884C\uFF1A\u6700\u7EC8\u8F93\u51FA\u51FA\u73B0\u540E\u5DE5\u4F5C\u8FC7\u7A0B\u6574\u4F53\u9690\u85CF\uFF0C\u53EA\u7559\u8FD9\u4E00\u884C + \u65F6\u957F\u3002
   \u5B57\u4F53\u4E0E\u4E8C\u7EA7 chip \u5BF9\u9F50\uFF0814px/24px\uFF09\uFF0C\u5DE6\u53F3\u65E0\u5185\u8FB9\u8DDD\uFF08\u4E0E\u6B63\u6587\u5DE6\u7F18\u5BF9\u9F50\uFF09\u3002 */
.dshcf-processed {
  display: inline-flex;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  border: none;
  background: none;
  font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
  /* \u5BF9\u9F50 DSH \u539F\u751F\u5DE5\u5177\u884C\u6458\u8981\u7684\u6B21\u7EA7\u5C42\u7EA7\uFF08label-tertiary\uFF09\u3002 */
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: color 0.15s ease;
}
.dshcf-processed:hover {
  color: var(--dsw-alias-label-primary);
  background: transparent;
}
.dshcf-processed:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, rgba(77, 107, 254, 0.8));
  outline-offset: 2px;
}
/* \u6298\u53E0\u7BAD\u5934\uFF1A\u4F7F\u7528 DSH \u539F\u751F IconChevronDownOutline14 \u7684 14x14 path\u3002 */
.dshcf-processed .dshcf-processed-chevron {
  display: inline-flex;
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.55;
  transform: rotate(-90deg);
  transition: transform 0.12s ease, opacity 0.1s ease;
}
.dshcf-processed:hover .dshcf-processed-chevron {
  opacity: 0.9;
}
.dshcf-processed[aria-expanded="true"] .dshcf-processed-chevron {
  transform: rotate(0deg);
}

/* \u4E09\u7EA7\u5408\u5E76\u601D\u8003\u884C\uFF1A\u5C55\u5F00\u4E8C\u7EA7\u540E\u8FDE\u7EED\u601D\u8003\u5408\u5E76\u4E3A\u4E00\u884C\uFF08\u6807\u9898 = \u7B2C\u4E00\u884C\u601D\u8003\u5185\u5BB9\uFF09\u3002
   \u6837\u5F0F\u4E0E chip \u540C\u65CF\uFF0816px \u56FE\u6807\u76D2\u300114px/24px\u3001\u539F\u751F label token \u8272\uFF09\u3002 */
.dshcf-merged-think {
  box-sizing: border-box;
  display: flex;
  align-self: flex-start;
  align-items: center;
  gap: 6px;
  width: fit-content;
  max-width: 100%;
  min-height: 24px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: 400 14px/24px system-ui, -apple-system, "Segoe UI", sans-serif;
  text-align: left;
  cursor: pointer;
  user-select: none;
}
.dshcf-merged-think .dshcf-leading {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}
.dshcf-merged-think .dshcf-leading svg {
  display: block;
  color: var(--dsw-alias-label-tertiary);
}
.dshcf-merged-think .dshcf-merged-title {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 85%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-secondary);
  font-weight: 400;
}
.dshcf-merged-think .dshcf-chevron {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--dsw-alias-label-secondary);
  opacity: 0.55;
  transform: rotate(-90deg);
  transition: transform 0.12s ease, opacity 0.1s ease;
}
.dshcf-merged-think:hover .dshcf-chevron,
.dshcf-merged-think:focus-visible .dshcf-chevron {
  opacity: 0.9;
}
.dshcf-merged-think[aria-expanded="true"] .dshcf-chevron {
  transform: rotate(0deg);
}
/* \u5408\u5E76\u601D\u8003\u5185\u5BB9\u5757\uFF1A\u56DB\u4E2A\u601D\u8003\u5408\u5E76\u4E3A\u4E00\u4E2A\u6574\u4F53\uFF08\u5BF9\u9F50\u56FE\u6807\u53F3\u4FA7\u7F29\u8FDB\uFF09\u3002 */
.dshcf-merged-body {
  margin: 0 0 16px;
  padding-left: 22px;
  color: var(--dsw-alias-label-secondary);
  font: 400 13px/22px system-ui, -apple-system, "Segoe UI", sans-serif;
  white-space: pre-wrap;
  word-break: break-word;
}

/* chevron\uFF1A\u9ED8\u8BA4\u9690\u85CF\uFF0Chover/focus \u6D6E\u73B0\uFF0C\u5C55\u5F00\u65F6\u65CB\u8F6C 90\xB0\uFF08Codex \u540C\u6B3E\uFF09\u3002 */
.dshcf-chip .dshcf-chevron {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.5;
  transform: rotate(-90deg);
  transition: opacity 0.1s ease, transform 0.12s ease;
}
.dshcf-chip:hover .dshcf-chevron,
.dshcf-chip:focus-visible .dshcf-chevron,
.dshcf-chip[aria-expanded="true"] .dshcf-chevron {
  opacity: 0.9;
}
.dshcf-chip[aria-expanded="true"] .dshcf-chevron {
  transform: rotate(0deg);
}
.dshcf-chip:focus-visible {
  outline: 2px solid var(--dsw-alias-state-focus-ring, rgba(77, 107, 254, 0.8));
  outline-offset: 2px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .dshcf-chip.running .dshcf-leading svg { animation: none; }
  .dshcf-chip.running .dshcf-chip-title,
  .dshcf-chip.running .dshcf-chip-summary {
    animation: none;
    opacity: 1;
  }
}
`;
  var FoldController = class {
    constructor(statusTextProvider2, options) {
      this.observer = null;
      /** 防止同一个控制器重复注册 observer、定时器和可见性监听。 */
      this.started = false;
      /** body 尚未创建时等待 DOMContentLoaded，再补一次启动。 */
      this.waitingForBody = false;
      this.onDomContentLoaded = () => {
        this.waitingForBody = false;
        this.start();
      };
      this.raf = 0;
      this.timer = 0;
      this.disposed = false;
      this.lastPassError = "";
      this.flow = null;
      /** 稳定 block key → 当前 React 渲染中的 chip/host。 */
      this.chips = /* @__PURE__ */ new Map();
      this.currentBlocks = /* @__PURE__ */ new Map();
      this.blockExpanded = /* @__PURE__ */ new Map();
      /** host → 三级合并思考行（展开二级后连续思考合并显示为一个三级行）。 */
      this.mergedThinks = /* @__PURE__ */ new Map();
      /** 合并思考行的展开状态（true = 显示合并内容块）。 */
      this.mergedExpanded = /* @__PURE__ */ new WeakSet();
      /** 合并内容缓存（首次从原生行读取后保存，pass 重建内容块时不再重新展开原生行）。 */
      this.mergedBodyTexts = /* @__PURE__ */ new WeakMap();
      /** 合并行标题缓存（原生行展开态提取不到摘要时保持首次标题，不丢成“思考”）。 */
      this.mergedTitles = /* @__PURE__ */ new WeakMap();
      /** 稳定 segment key → 一级折叠行与展开状态。 */
      this.segmentStates = /* @__PURE__ */ new Map();
      /** segment 首次观察到 running 的时间，用于没有官方时长的实时回合。 */
      this.runningSince = /* @__PURE__ */ new Map();
      /** 曾完成过的 segment key：段恢复运行时据此重开本地计时，防止重新结算
       * 的本地时长吞掉完成间隙。 */
      this.completedOnce = /* @__PURE__ */ new Set();
      /** 插件改写 display 前的精确原值；受控集合用于分类漂移和 stop() 恢复。 */
      this.originalDisplay = /* @__PURE__ */ new WeakMap();
      this.controlledDisplay = /* @__PURE__ */ new Set();
      /** 元素 → 插件最后确保的 display 值：恢复前与当前内联值比对，漂移即视为
       * 外部介入（镜像 turnStatusTexts 的 original/written 双快照守卫，issue #11）。 */
      this.writtenDisplay = /* @__PURE__ */ new WeakMap();
      /** 被改写为状态提示词的原生状态文本：original = 宿主原文（卸载还原用），
       * written = 插件最后一次写入的值（仅当节点仍等于它时才还原，避免覆盖
       * 宿主在插件写入之后的状态更新）。 */
      this.turnStatusTexts = /* @__PURE__ */ new Map();
      /** 正文判定缓存（消息元素 → 有无正文）：流式期间只有被 mutation 命中的
       * 消息失效重算，历史消息跨 pass 复用，避免每帧全量 TreeWalker。 */
      this.bodyTextCache = /* @__PURE__ */ new WeakMap();
      /** 自上次 pass 以来子树发生变化的 flow 顶层消息；pass 开头统一失效。 */
      this.dirtyMessages = /* @__PURE__ */ new Set();
      /** 在途显示动画（元素 → 记录）：冲突仲裁、记账对齐与生命周期清理的依据。
      /** 在途显示动画（元素 → 记录）：冲突仲裁、记账对齐与生命周期清理的依据。
       * 用 Map 不用 WeakMap——switchFlow/stop 需要遍历全量 cancel。 */
      this.pendingAnims = /* @__PURE__ */ new Map();
      /** 手势点击的一次性可动画 block key；segment 级点击另保留中间正文的门控。 */
      this.animatableKeys = /* @__PURE__ */ new Set();
      /** segment 点击时只让点击前已存在的 block 播放 reveal；流式中新出现的
       * 临时分裂块直接显示，避免分类收敛时留下半透明 stale chip。 */
      this.animatableSegmentBlocks = /* @__PURE__ */ new Map();
      /** 外部变更对账定时器句柄（自重排 setTimeout 链，见 armAuditLoop）。 */
      this.auditTimer = 0;
      /** 上一轮 pass 记录的关键元素内联 display，用于 audit 轻量检测漂移。
       * audit 只读这份快照，不在页面稳定时重新执行完整 pass。 */
      this.auditDisplays = /* @__PURE__ */ new Map();
      /** 自上次 pass 以来 flow 子树发生过结构变化（childList）或正文判定翻转：
       * 为 true 时 pass 重建分块快照，否则复用 currentBlocks——characterData/
       * attributes 批次（流式文本、data-state 翻转）不改变块结构，跳过全量
       * querySelectorAll 重扫（issue #14：长会话下每轮重扫造成主线程卡顿）。 */
      this.structureDirty = true;
      /** 本轮 pass 的原生 turn 摘要快照（turn id → 开合态）：每轮重建，不跨轮复用；
       * data-open 翻转不改变块结构也能驱动重算，见 buildNativeTurnMap。 */
      this.nativeTurns = /* @__PURE__ */ new Map();
      /** 被折叠掏空后藏起的中间包装层（真机 44px vs 28px 真因：think 行全隐后
       * 其父容器变零高度空壳，仍作为 flex item 参与父级 gap，凭空多出 16px）。
       * 内容恢复（展开/流式追加/块转世）时同函数恢复显示；switchFlow 清空。 */
      this.emptiedWrappers = /* @__PURE__ */ new Set();
      /** 本轮 pass 内有过 display 实写（hide/restore 瞬时路径）。空洞发现的触发
       * 条件之一：纯 display 收放不产生 childList，不触发 structureDirty。
       * settle 触发的后续 pass 则由 settleFired 覆盖。读后即清（见发现调用点）。 */
      this.displayTouched = false;
      /** 有 fade 自然结算过（chipSettle 跑过）。结算本身不写 display，但它意味着
       * 某行刚变隐藏——空洞可能刚形成。 */
      this.settleFired = false;
      /** 滚动稳定化（issue #14）：flow 最近的滚动容器缓存（按 flow 身份失效）。 */
      this.scrollContainer = null;
      this.scrollContainerFlow = null;
      /** 回到前台立即补一轮对账；后台 tab 由 document.hidden 门控跳过。 */
      this.onVisibilityChange = () => {
        if (typeof document === "undefined" || document.hidden !== true) this.schedule();
      };
      this.statusTextProvider = statusTextProvider2 ?? (() => DEFAULT_STATUS_TEXT);
      this.auditIntervalMs = options?.auditIntervalMs ?? AUDIT_TICK_MS;
    }
    /** 设置变更后重跑一轮，让状态提示词立即生效。 */
    refresh() {
      this.schedule();
    }
    start() {
      if (this.disposed || this.started || this.waitingForBody) return;
      if (typeof document === "undefined") return;
      if (document.body === null) {
        if (typeof document.addEventListener !== "function") return;
        this.waitingForBody = true;
        document.addEventListener("DOMContentLoaded", this.onDomContentLoaded, { once: true });
        return;
      }
      injectStyle();
      try {
        this.observer = new MutationObserver((records) => {
          if (this.shouldSchedule(records)) {
            this.markDirty(records);
            this.schedule();
          }
        });
        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          // 原生 TurnProcess 开合只改 attribute（成员 data-turn-process-hidden、
          // 摘要按钮 data-open），必须进过滤器才能即时调度；插件自身从不写
          // 这两个属性，不会自激。
          attributeFilter: ["data-selected", "data-state", "data-turn-process-hidden", "data-open"],
          // 流式文本更新（React 改 text node 的 data）属于 characterData
          // mutation：不观察则二级摘要/滚动跟随只能靠偶发结构变化驱动，
          // 变成“隔几秒跳一次”。所有文本写入都有守卫（值不变不写），
          // 不会自激。
          characterData: true
        });
        this.started = true;
        this.armAuditLoop();
        this.schedule();
      } catch (error) {
        this.observer?.disconnect();
        this.observer = null;
        this.started = false;
        this.reportError(error);
        throw error;
      }
    }
    /** 外部显示变更对账循环（issue #11 Bug B）：外部对宿主行的 style 写入不产生
     * observer record（style 不在 attributeFilter 内，监听会因插件自身直写 style
     * 自激），改用低频轻量对账兜底——发现漂移后才由 pass 收敛；
     * 后台 tab 由 document.hidden 门控跳过，回前台由 visibilitychange 立即补一轮。
     * 用自重排 setTimeout 链而非 setInterval：与 schedule 的兜底定时器同源，
     * 测试桩 clearTimers 后链条自然熄灭。 */
    armAuditLoop() {
      if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", this.onVisibilityChange);
      }
      this.rearmAudit();
    }
    rearmAudit() {
      if (this.disposed || this.auditTimer !== 0) return;
      this.auditTimer = setTimeout(() => {
        this.auditTimer = 0;
        if (this.disposed) return;
        if (typeof document !== "undefined" && document.hidden === true) {
          this.rearmAudit();
          return;
        }
        this.audit();
        this.rearmAudit();
      }, this.auditIntervalMs);
    }
    /** 低成本显示状态对账：只有发现外部漂移时才启动完整 pass。
     *
     * 外部 style.display 写入不会产生当前 observer 的 attribute 记录，
     * 因此仍保留 audit；但稳定页面不应每秒重扫整个 flow。快照只覆盖
     * flow 顶层行、插件控制中的宿主行和插件自有展示行，避免引入布局读取。 */
    audit() {
      if (this.disposed) return;
      const flow = this.flow;
      if (flow === null || !flow.isConnected) {
        if (flow !== null) this.schedule();
        return;
      }
      const current = this.collectAuditDisplays(flow);
      if (current.size !== this.auditDisplays.size) {
        this.schedule();
        return;
      }
      for (const [el, display] of current) {
        if (this.auditDisplays.get(el) !== display) {
          this.schedule();
          return;
        }
        if (this.controlledDisplay.has(el) && this.displayForeign(el)) {
          this.schedule();
          return;
        }
      }
      for (const el of [...this.emptiedWrappers]) {
        if (!el.isConnected) {
          this.emptiedWrappers.delete(el);
          continue;
        }
        if (!this.isHollow(el)) {
          this.restoreElement(el);
          if (el.style.display === "none") el.style.display = "";
          this.emptiedWrappers.delete(el);
        }
      }
    }
    stop() {
      this.disposed = true;
      this.started = false;
      this.waitingForBody = false;
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("DOMContentLoaded", this.onDomContentLoaded);
      }
      if (this.raf !== 0) cancelAnimationFrame(this.raf);
      if (this.timer !== 0) clearTimeout(this.timer);
      if (this.auditTimer !== 0) {
        clearTimeout(this.auditTimer);
        this.auditTimer = 0;
      }
      if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
      }
      this.observer?.disconnect();
      this.switchFlow(null);
      removeStyle();
    }
    /** body 级 observer 只负责发现 flow 替换；已有 flow 外的文本变化不再触发全量扫描。 */
    shouldSchedule(records) {
      if (records.length === 0 || this.flow === null || !this.flow.isConnected) return true;
      return records.some((record) => this.isRelevantMutation(record));
    }
    /** 判断 mutation 是否会影响宿主 flow；插件自有节点的回写直接忽略，
     * 避免“pass 插入 chip → observer 再开一轮 pass”的自激循环。 */
    isRelevantMutation(record) {
      const flow = this.flow;
      if (flow === null || !flow.isConnected) return true;
      if (!nodeWithin(record.target, flow) && !nodeWithin(flow, record.target)) return false;
      if (record.type === "characterData" && record.target instanceof Text && this.turnStatusTexts.has(record.target)) {
        return false;
      }
      const changed = [
        ...Array.from(record.addedNodes ?? []),
        ...Array.from(record.removedNodes ?? [])
      ];
      if (changed.length > 0 && changed.every(isPluginOwnedNode)) return false;
      if (changed.length === 0 && isPluginOwnedNode(record.target)) return false;
      return true;
    }
    /** 记录本批 mutation 命中的 flow 顶层消息，供正文判定缓存定向失效。
     * 从 record.target 沿 parentNode 走到 flow 的直接子级即所属消息。
     * 失效粒度（issue #14）：只有 childList 使分块快照失效；flow 直挂层的
     * 插件节点/文本节点与 flow 外的混批记录不影响任何消息的正文判定，跳过
     * 而非全量失效——旧逻辑把它们全部放大成 O(全会话) 的 TreeWalker 重扫，
     * 长会话流式期间每帧如此。空批次仍保守全量失效（测试桩的调度通知）。 */
    markDirty(records) {
      const flow = this.flow;
      if (flow === null || !flow.isConnected) return;
      if (records.length === 0) {
        this.bodyTextCache = /* @__PURE__ */ new WeakMap();
        this.dirtyMessages.clear();
        this.structureDirty = true;
        return;
      }
      for (const record of records.filter((record2) => this.isRelevantMutation(record2))) {
        if (record.type === "childList") this.structureDirty = true;
        if (record.target === flow) {
          for (const node of record.addedNodes ?? []) {
            if (node instanceof HTMLElement) this.dirtyMessages.add(node);
          }
          continue;
        }
        const owner = flowChildOwner(record.target, flow);
        if (owner !== null) this.dirtyMessages.add(owner);
      }
    }
    schedule() {
      if (this.disposed || this.raf !== 0) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        if (this.timer !== 0) {
          clearTimeout(this.timer);
          this.timer = 0;
        }
        this.runPass();
      });
      if (this.timer !== 0) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = 0;
        if (this.raf !== 0) {
          cancelAnimationFrame(this.raf);
          this.raf = 0;
          this.runPass();
        }
      }, 60);
    }
    /** 异步 observer 异常不能静默杀死协调器；保留非可视诊断并允许后续 mutation 重试。 */
    runPass() {
      try {
        this.pass();
        this.lastPassError = "";
        const style = document.getElementById(STYLE_ID);
        style?.setAttribute("data-dshcf-state", "active");
        style?.removeAttribute("data-dshcf-error");
      } catch (error) {
        this.reportError(error);
      } finally {
        this.animatableKeys.clear();
        this.animatableSegmentBlocks.clear();
      }
    }
    reportError(error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      const style = document.getElementById(STYLE_ID);
      style?.setAttribute("data-dshcf-state", "error");
      style?.setAttribute("data-dshcf-error", message.slice(0, 500));
      if (message === this.lastPassError) return;
      this.lastPassError = message;
      console.error("[dsh-auto-collapse] fold pass failed", error);
    }
    /** 一轮重放：重算堆积 → 应用折叠/展开 → 摆放并更新 chip → 替换状态行。 */
    pass() {
      if (this.disposed) return;
      const nextFlow = findFlow();
      if (nextFlow !== this.flow) this.switchFlow(nextFlow);
      const flow = this.flow;
      if (flow === null) return;
      let bodyFlipped = false;
      for (const el of this.dirtyMessages) {
        const prev = this.bodyTextCache.get(el);
        this.bodyTextCache.delete(el);
        if (prev !== void 0 && this.hasBodyCached(el) !== prev) bodyFlipped = true;
      }
      this.dirtyMessages.clear();
      const rebuildBlocks = this.structureDirty || bodyFlipped || this.currentBlocks.size === 0;
      this.structureDirty = false;
      const blocks = rebuildBlocks ? findBlocks(flow, (el) => this.hasBodyCached(el)) : [...this.currentBlocks.values()];
      this.currentBlocks = new Map(blocks.map((block) => [block.key, block]));
      const segments = buildSegments(flow, blocks, (el) => this.hasBodyCached(el));
      const liveSegmentKeys = new Set(segments.map((segment) => segment.key));
      this.nativeTurns = buildNativeTurnMap(flow);
      const scrollAnchor = this.captureScrollAnchor(flow);
      for (const segment of segments) {
        if (!segment.running) continue;
        if (this.completedOnce.has(segment.key)) {
          this.completedOnce.delete(segment.key);
          this.runningSince.delete(segment.key);
        }
        if (!this.runningSince.has(segment.key)) {
          this.runningSince.set(segment.key, Date.now());
        }
      }
      const completedKeys = /* @__PURE__ */ new Set();
      for (const snapshot of segments) {
        if (!snapshot.closed || snapshot.running || !snapshot.hasWork) continue;
        completedKeys.add(snapshot.key);
        this.completedOnce.add(snapshot.key);
        if (segmentHasNativeTurn(snapshot, this.nativeTurns)) {
          const prev = this.segmentStates.get(snapshot.key);
          prev?.row?.remove();
          if (prev !== void 0) this.segmentStates.delete(snapshot.key);
          continue;
        }
        let state = this.segmentStates.get(snapshot.key);
        if (state === void 0) {
          state = { key: snapshot.key, row: null, expanded: false, snapshot };
          this.segmentStates.set(snapshot.key, state);
        } else {
          state.snapshot = snapshot;
        }
        const started = this.runningSince.get(snapshot.key);
        const parsed = snapshot.boundary === null ? void 0 : parseTurnDuration(snapshot.boundary);
        if (parsed !== void 0) state.duration = parsed;
        else if (state.duration === void 0 && started !== void 0) state.duration = Date.now() - started;
        if (state.row === null || !state.row.isConnected) state.row = this.createProcessedRow(state);
        this.syncProcessedRow(state);
      }
      for (const [key, state] of [...this.segmentStates]) {
        if (completedKeys.has(key)) continue;
        state.row?.remove();
        this.segmentStates.delete(key);
      }
      const segmentByBlock = /* @__PURE__ */ new Map();
      for (const segment of segments) {
        for (const block of segment.blocks) segmentByBlock.set(block.key, segment);
      }
      const desiredHidden = /* @__PURE__ */ new Set();
      const seenBlocks = /* @__PURE__ */ new Set();
      for (const block of blocks) {
        seenBlocks.add(block.key);
        this.reconcileBlock(block, segmentByBlock.get(block.key) ?? null, desiredHidden);
      }
      if (rebuildBlocks || this.displayTouched || this.settleFired) {
        const hosts = /* @__PURE__ */ new Set();
        for (const block of this.currentBlocks.values()) {
          if (block.host.isConnected) hosts.add(block.host);
        }
        for (const segment of segments) {
          if (segment.finalStep?.isConnected) hosts.add(segment.finalStep);
          for (const middle of segment.middleSteps) {
            if (middle.isConnected) hosts.add(middle);
          }
        }
        this.discoverHollowWrappers(hosts, desiredHidden);
      }
      this.displayTouched = false;
      this.settleFired = false;
      for (const segment of segments) {
        const state = this.segmentStates.get(segment.key);
        const collapse = state !== void 0 && !state.expanded;
        const animate = this.animatableKeys.has(segment.key);
        for (const middle of segment.middleSteps) {
          if (collapse) this.hideElement(middle, desiredHidden, animate);
          else this.restoreElement(middle, animate);
        }
        if (segment.finalStep !== null) this.restoreElement(segment.finalStep);
      }
      for (const segment of segments) {
        if (segment.hasWork && hasVisibleSegmentWork(segment)) continue;
        const state = this.segmentStates.get(segment.key);
        if (state !== void 0 && state.row !== null) {
          state.row.remove();
          state.row = null;
        }
        for (const block of segment.blocks) this.suppressBlock(block, desiredHidden);
        for (const middle of segment.middleSteps) this.retainDisplayControl(middle, desiredHidden);
        if (segment.finalStep !== null) this.retainDisplayControl(segment.finalStep, desiredHidden);
      }
      this.cleanupStaleChips(seenBlocks);
      for (const [el, record] of [...this.pendingAnims]) {
        if (record.target === "hidden" && record.kind === "fade" && this.pendingAnims.get(el) === record && this.isAnimOverdue(record.anim)) {
          this.finishFadeCollapse(el, record);
        }
      }
      this.restoreUnusedDisplays(desiredHidden);
      for (const state of this.segmentStates.values()) this.placeProcessedRow(flow, state);
      this.stabilizeScrollAfterFold(scrollAnchor);
      for (const key of [...this.runningSince.keys()]) {
        if (!liveSegmentKeys.has(key)) this.runningSince.delete(key);
      }
      for (const key of [...this.completedOnce]) {
        if (!liveSegmentKeys.has(key)) this.completedOnce.delete(key);
      }
      for (const [node] of [...this.turnStatusTexts]) {
        if (!node.isConnected) this.turnStatusTexts.delete(node);
      }
      for (const [el] of [...this.pendingAnims]) {
        if (!el.isConnected) this.pendingAnims.delete(el);
      }
      const statusText = this.statusTextProvider();
      if (statusText === void 0 || statusText === "") {
        restoreTurnStatus(this.turnStatusTexts);
      } else {
        replaceTurnStatus(flow, this.turnStatusTexts, statusText);
      }
      this.captureAuditDisplays(flow);
    }
    /** flow 最近的滚动容器（issue #14 滚动稳定化的测量基准）：沿父链找第一个
     * overflow-y 为 auto/scroll 且实际可滚动的祖先。结果按 flow 身份缓存；
     * 找不到时不缓存（内容增长后祖先可能变为可滚动），每 pass 重探的代价
     * 只是几次 clean-layout 的 computed style / scrollHeight 读取。 */
    findScrollContainer(flow) {
      if (this.scrollContainerFlow === flow && this.scrollContainer !== null && this.scrollContainer.isConnected && nodeWithin(flow, this.scrollContainer)) {
        return this.scrollContainer;
      }
      let node = flow.parentElement;
      while (node !== null) {
        if (typeof getComputedStyle === "function") {
          const oy = getComputedStyle(node).overflowY;
          if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) break;
        }
        node = node.parentElement;
      }
      if (node === null) return null;
      this.scrollContainer = node;
      this.scrollContainerFlow = flow;
      return node;
    }
    /** 几何写入前捕捉贴底意图（issue #14）：视口距底 ≤ 上游 FOLLOW_THRESHOLD
     * 时返回锚点，stabilizeScrollAfterFold 在写入后同帧钉回底部。远离底部
     * （用户正在滚动浏览）时不干预——视口上方的高度变化由浏览器 scroll
     * anchoring 补偿，视口下方的折叠不可见，插件再写 scrollTop 只会加入
     * 上游吸底回写的拉锯。 */
    captureScrollAnchor(flow) {
      const scroller = this.findScrollContainer(flow);
      if (scroller === null) return null;
      const dist = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      return dist <= STICK_BOTTOM_THRESHOLD_PX ? { el: scroller } : null;
    }
    /** 几何写入后把贴底视口钉回底部：折叠让 scrollHeight 缩小时若不在此帧
     * 补写 scrollTop，宿主 ChatView 要到下一帧 ResizeObserver 才吸底回写，
     * 中间的空档让触控板惯性滚动乘虚而入，反复折叠时表现为上下抽搐（用户
     * 实测：长会话滚到底部附近无法稳定定位）。同一帧内钉回后，宿主的吸底
     * 回写成为幂等 no-op，不再是第二个 scrollTop 写入方。 */
    stabilizeScrollAfterFold(anchor) {
      if (anchor === null) return;
      const el = anchor.el;
      if (!el.isConnected) return;
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist > STICK_BOTTOM_THRESHOLD_PX) el.scrollTop = el.scrollHeight - el.clientHeight;
    }
    /** flow 元素变化即视为会话切换：完整恢复旧 flow，再从新 DOM 重建。 */
    switchFlow(next) {
      if (next === this.flow) return;
      for (const [el, record] of this.pendingAnims) {
        record.anim.cancel();
        if (record.kind === "height") this.clearCollapseLock(el);
      }
      this.pendingAnims.clear();
      this.animatableKeys.clear();
      this.animatableSegmentBlocks.clear();
      for (const record of this.chips.values()) record.chip.remove();
      this.chips.clear();
      for (const host of [...this.mergedThinks.keys()]) this.removeMergedThink(host);
      for (const state of this.segmentStates.values()) state.row?.remove();
      this.segmentStates.clear();
      this.currentBlocks.clear();
      this.blockExpanded.clear();
      this.runningSince.clear();
      this.completedOnce.clear();
      this.bodyTextCache = /* @__PURE__ */ new WeakMap();
      this.dirtyMessages.clear();
      this.auditDisplays.clear();
      this.nativeTurns.clear();
      this.emptiedWrappers.clear();
      this.structureDirty = true;
      this.restoreAllDisplays();
      restoreTurnStatus(this.turnStatusTexts);
      this.flow = next;
    }
    createProcessedRow(state) {
      const row = createProcessedRowElement(state.duration);
      row.addEventListener("click", () => {
        state.expanded = !state.expanded;
        this.animatableKeys.add(state.key);
        this.animatableSegmentBlocks.set(state.key, new Set(state.snapshot.blocks.map((block) => block.key)));
        if (state.expanded) {
          for (const block of state.snapshot.blocks) {
            this.blockExpanded.set(block.key, false);
            this.removeMergedThink(block.host);
          }
        }
        this.syncProcessedRow(state);
        this.schedule();
      });
      return row;
    }
    syncProcessedRow(state) {
      const row = state.row;
      if (row === null) return;
      const text = row.firstElementChild;
      const label = state.duration === void 0 ? "\u5DF2\u5904\u7406" : `\u5DF2\u5904\u7406 ${formatDuration(state.duration)}`;
      if (text !== null && text.textContent !== label) text.textContent = label;
      const expanded = String(state.expanded);
      if (row.getAttribute("aria-expanded") !== expanded) row.setAttribute("aria-expanded", expanded);
      row.title = state.expanded ? "\u6536\u8D77\u5DE5\u4F5C\u8FC7\u7A0B" : "\u5C55\u5F00\u5DE5\u4F5C\u8FC7\u7A0B";
    }
    placeProcessedRow(flow, state) {
      const row = state.row;
      if (row === null) return;
      if (!state.snapshot.hasWork || !hasVisibleSegmentWork(state.snapshot)) {
        row.remove();
        state.row = null;
        return;
      }
      let target = state.snapshot.firstWork ?? state.snapshot.finalStep ?? state.snapshot.boundary;
      if (target === null || target.parentElement !== flow) {
        row.remove();
        state.row = null;
        return;
      }
      while (target.previousElementSibling?.classList.contains("dshcf-flow-chip") === true) {
        target = target.previousElementSibling;
      }
      if (row.parentElement !== flow || row.nextElementSibling !== target) target.before(row);
    }
    /** 原生收起时隐藏本块插件自有 overlay（chip/合并行+内容块）：只做
     * display 直写，不清钉住之外的账本、不删展开态，供原生再展开后复用。
     * 在途 WAAPI 动画不追踪取消——收尾回调只做幂等终态对齐，无残留。 */
    hideOverlayForNativeCollapse(block) {
      const existing = this.chips.get(block.key)?.chip;
      if (existing !== void 0 && existing.style.display !== "none") {
        existing.style.marginBottom = "";
        existing.style.display = "none";
      }
      const row = this.mergedThinks.get(block.host);
      if (row !== void 0 && row.style.display !== "none") {
        row.style.display = "none";
        const body = row.nextElementSibling;
        if (body instanceof HTMLElement && body.classList.contains("dshcf-merged-body") && body.style.display !== "none") {
          body.style.display = "none";
        }
      }
    }
    reconcileBlock(block, segment, desiredHidden) {
      if (blockNativelyCollapsed(block, this.nativeTurns)) {
        this.hideOverlayForNativeCollapse(block);
        return;
      }
      const state = segment === null ? void 0 : this.segmentStates.get(segment.key);
      const segmentAnimatableBlocks = segment === null ? void 0 : this.animatableSegmentBlocks.get(segment.key);
      const animate = this.animatableKeys.has(block.key) || segment !== null && this.animatableKeys.has(segment.key) && (segmentAnimatableBlocks === void 0 || segmentAnimatableBlocks.has(block.key));
      const levelCollapsed = state !== void 0 && !state.expanded;
      if (levelCollapsed) {
        const keepHost = segment?.finalStep === block.host && this.hasBodyCached(block.host);
        let hostFade = false;
        if (keepHost) this.restoreElement(block.host);
        else hostFade = this.hideElement(block.host, desiredHidden, animate);
        for (const container of block.containers) this.hideElement(container, desiredHidden, animate);
        for (const row of block.rows) this.hideElement(row, desiredHidden, animate);
        const existing = this.chips.get(block.key)?.chip;
        if (existing !== void 0 && existing.style.display !== "none") {
          existing.style.marginBottom = "";
          if (block.mount === "before" || keepHost) {
            if (animate && this.canAnimate(existing)) this.startFadeCollapse(existing);
            else existing.style.display = "none";
          } else if (!hostFade) {
            existing.style.display = "none";
          }
        }
        this.syncEmptiedWrappers(block, desiredHidden);
        return;
      }
      let expanded = this.blockExpanded.get(block.key) ?? false;
      if (!expanded && block.rows.some((row) => row.hasAttribute("data-selected"))) {
        expanded = true;
        this.blockExpanded.set(block.key, true);
      }
      const chip = this.ensureChip(block);
      const hostIsCollapsedRow = !expanded && block.rows.includes(block.host);
      const hostWasHidden = block.host.style.display === "none";
      const hostAnimate = !hostIsCollapsedRow && hostWasHidden && animate;
      if (!hostIsCollapsedRow) this.restoreElement(block.host, hostAnimate);
      const pendingChip = this.pendingAnims.get(chip);
      if (pendingChip?.target === "hidden") this.cancelPendingSync(chip);
      const chipWasHidden = chip.style.display === "none";
      if (chip.style.display !== "") chip.style.display = "";
      if (chipWasHidden && animate && !(hostAnimate && block.mount === "inside")) this.revealVisual(chip);
      if (expanded || !this.hasPendingCollapse(block)) this.unpinChipMargin(chip);
      const chipSettle = () => {
        this.settleFired = true;
        if (!this.hasPendingCollapse(block)) this.unpinChipMargin(chip);
      };
      for (const container of block.containers) {
        if (expanded) this.restoreElement(container, animate);
        else {
          const started = this.hideElement(container, desiredHidden, animate, chipSettle);
          if (started) this.pinChipMargin(chip);
        }
      }
      for (const row of block.rows) {
        if (expanded) this.restoreElement(row, animate);
        else {
          const started = this.hideElement(row, desiredHidden, animate, chipSettle);
          if (started) this.pinChipMargin(chip);
        }
      }
      if (expanded && block.rows.length > 1 && block.rows.every((row) => isThinkRow(row))) {
        this.syncMergedThink(block.host, block.rows, desiredHidden, animate);
      } else {
        if (this.releaseMergedThink(block.host, animate, chipSettle)) this.pinChipMargin(chip);
      }
      this.syncEmptiedWrappers(block, desiredHidden);
      chip.classList.toggle("dshcf-has-body", block.mount === "inside" && this.hasBodyCached(block.host));
      updateChip(chip, block.rows, expanded);
    }
    /**
     * 掏空包装层对账（真机 44px vs 28px 真因修复）。
     *
     * 折叠把某容器的子行全部 display:none 后，该容器变零高度空壳，但仍是
     * 父级 flex 的 item 并参与 gap（如正文体 flex-column gap:16px），凭空多出
     * 一份间距。隐藏这类空壳可让 gap 塌缩；子内容恢复可见（展开/流式追加/
     * 块转世）时恢复显示。
     *
     * 安全边界：
     * - 只看 block.host 内部、不含 host 本人（宿主显隐归 segment 逻辑）；
     * - 跳过结构 seat（data-chat-flow-kind / data-chat-anchor-key）与插件
     *   自身 overlay（dshcf- 前缀类）；
     * - 只隐藏内容空洞（无可见子内容）：零高度无文本的空壳 display:none 与
     *   保持显示像素一致，只塌缩父级 gap；任何一方恢复内容即恢复显示。
     */
    /**
     * 空洞包装层兜底发现：按宿主直扫 div（仅结构变化轮次调用）。
     * 只做隐藏侧：空洞即藏并记入 tracked；恢复侧由 syncEmptiedWrappers 的
     * tracked 复核与 audit 承担。与按行 walk 共用同一安全边界（结构 seat /
     * 插件 overlay / 宿主本人不碰）。
     */
    discoverHollowWrappers(hosts, desiredHidden) {
      for (const host of hosts) {
        if (!host.isConnected) continue;
        let divs;
        try {
          divs = [...host.querySelectorAll("div")];
        } catch {
          continue;
        }
        for (const el of divs) {
          if (el === host || !(el instanceof HTMLElement)) continue;
          const cls = el.className;
          if (typeof cls === "string" && cls.split(" ").some((c) => c.startsWith("dshcf-"))) continue;
          if (el.hasAttribute("data-chat-flow-kind") || el.hasAttribute("data-chat-anchor-key")) continue;
          if (this.isHollow(el)) {
            this.hideElement(el, desiredHidden, false);
            this.emptiedWrappers.add(el);
          }
        }
      }
    }
    syncEmptiedWrappers(block, desiredHidden) {
      const flow = this.flow;
      if (flow === null) return;
      const scopeOf = (el) => {
        let cur = el?.parentElement ?? null;
        while (cur instanceof HTMLElement && cur.parentElement !== flow) {
          cur = cur.parentElement;
        }
        return cur instanceof HTMLElement && cur.parentElement === flow ? cur : null;
      };
      const candidates = [];
      const seen = /* @__PURE__ */ new Set();
      const scopes = /* @__PURE__ */ new Set();
      const collect = (el) => {
        const scope = scopeOf(el);
        if (scope === null) return;
        scopes.add(scope);
        let node = el?.parentElement ?? null;
        while (node instanceof HTMLElement && node !== scope) {
          if (!seen.has(node)) {
            seen.add(node);
            candidates.push(node);
          }
          node = node.parentElement;
        }
      };
      for (const row of block.rows) collect(row);
      for (const container of block.containers) collect(container);
      for (const el of [...this.emptiedWrappers]) {
        if (!el.isConnected) {
          this.emptiedWrappers.delete(el);
          continue;
        }
        const scope = scopeOf(el);
        if (scope === null || !scopes.has(scope)) continue;
        if (!seen.has(el)) {
          seen.add(el);
          candidates.push(el);
        }
      }
      for (const el of candidates) {
        if (!el.isConnected) {
          this.emptiedWrappers.delete(el);
          continue;
        }
        const cls = el.className;
        if (typeof cls === "string" && cls.split(" ").some((c) => c.startsWith("dshcf-"))) continue;
        if (el.hasAttribute("data-chat-flow-kind") || el.hasAttribute("data-chat-anchor-key")) continue;
        if (this.isHollow(el)) {
          this.hideElement(el, desiredHidden, false);
          this.emptiedWrappers.add(el);
        } else if (this.emptiedWrappers.delete(el)) {
          this.restoreElement(el);
        }
      }
    }
    /** 内容空洞判定：无可见子内容（文本/元素任一可见即非空洞）。隐藏者是谁
     * 不重要——零高度无文本节点 display:none 与保持显示像素一致（只塌缩父级
     * gap，正是要修的幻影）；任何一方恢复内容，下轮 pass/audit 即恢复显示。
     * isDisplayed 走 getComputedStyle（桩内退化为内联，语义一致）。 */
    isHollow(el) {
      for (const child of [...el.childNodes]) {
        if (child.nodeType === 3) {
          if ((child.textContent ?? "").trim() !== "") return false;
          continue;
        }
        if (!(child instanceof HTMLElement)) continue;
        if (isDisplayed(child)) return false;
      }
      return true;
    }
    ensureChip(block) {
      let record = this.chips.get(block.key);
      const validParent = record !== void 0 && (block.mount === "inside" ? record.chip.parentElement === block.host : record.chip.parentElement === block.host.parentElement);
      if (record === void 0 || record.host !== block.host || !record.chip.isConnected || !validParent) {
        if (record !== void 0) {
          record.chip.remove();
          this.removeMergedThink(record.host);
        }
        const chip2 = document.createElement("button");
        chip2.type = "button";
        chip2.className = block.mount === "before" ? "dshcf-chip dshcf-flow-chip" : "dshcf-chip";
        chip2.setAttribute("aria-expanded", "false");
        chip2.setAttribute("data-dshcf-block-key", block.key);
        const leading = document.createElement("span");
        leading.className = "dshcf-leading";
        leading.appendChild(createCommandIcon());
        chip2.appendChild(leading);
        chip2.appendChild(createSpan("dshcf-chip-title"));
        chip2.appendChild(createSpan("dshcf-chip-sep"));
        chip2.appendChild(createSpan("dshcf-chip-summary"));
        chip2.appendChild(createChevronIcon("dshcf-chevron"));
        chip2.style.display = "none";
        chip2.addEventListener("click", () => {
          this.blockExpanded.set(block.key, !(this.blockExpanded.get(block.key) ?? false));
          this.animatableKeys.add(block.key);
          this.schedule();
        });
        record = { host: block.host, chip: chip2 };
        this.chips.set(block.key, record);
      }
      const chip = record.chip;
      if (block.mount === "inside") {
        if (chip.parentElement !== block.host || block.host.firstElementChild !== chip) block.host.prepend(chip);
        chip.classList.remove("dshcf-flow-chip");
      } else {
        if (chip.parentElement !== block.host.parentElement || chip.nextElementSibling !== block.host) block.host.before(chip);
        chip.classList.add("dshcf-flow-chip");
      }
      return chip;
    }
    suppressBlock(block, desiredHidden) {
      const existing = this.chips.get(block.key)?.chip;
      if (existing !== void 0 && existing.style.display !== "none") {
        existing.style.marginBottom = "";
        existing.style.display = "none";
      }
      this.removeMergedThink(block.host);
      this.retainDisplayControl(block.host, desiredHidden);
      for (const row of block.rows) this.retainDisplayControl(row, desiredHidden);
      for (const container of block.containers) this.retainDisplayControl(container, desiredHidden);
    }
    retainDisplayControl(el, desiredHidden) {
      if (this.controlledDisplay.has(el)) desiredHidden.add(el);
    }
    cleanupStaleChips(seen) {
      for (const [key, record] of [...this.chips]) {
        if (seen.has(key)) continue;
        record.chip.remove();
        this.removeMergedThink(record.host);
        this.chips.delete(key);
        this.blockExpanded.delete(key);
      }
    }
    /** 连续思考合并行：插在第一个思考行前，标题用第一行思考内容；
     * 点击切换显示/隐藏全部原始思考行。 */
    syncMergedThink(host, rows, desiredHidden, animate = false) {
      let row = this.mergedThinks.get(host);
      if (row === void 0 || !row.isConnected) {
        row = document.createElement("button");
        row.type = "button";
        row.className = "dshcf-merged-think";
        row.setAttribute("aria-expanded", "false");
        const leading = document.createElement("span");
        leading.className = "dshcf-leading";
        leading.appendChild(createThinkIcon());
        const title = document.createElement("span");
        title.className = "dshcf-merged-title";
        const chevron = createChevronIcon("dshcf-chevron");
        row.append(leading, title, chevron);
        row.style.display = "none";
        const btn = row;
        btn.addEventListener("click", () => {
          if (this.mergedThinks.get(host) !== btn) return;
          const next = !this.mergedExpanded.has(host);
          if (next) {
            if (this.expandMergedBody(host, btn)) {
              this.mergedExpanded.add(host);
              btn.setAttribute("aria-expanded", "true");
            }
          } else {
            this.mergedExpanded.delete(host);
            btn.setAttribute("aria-expanded", "false");
            this.collapseMergedBody(host);
          }
        });
        rows[0].before(row);
        this.mergedThinks.set(host, row);
        row = btn;
      }
      const titleEl = row.querySelector(".dshcf-merged-title");
      if (titleEl !== null) {
        let title = this.mergedTitles.get(host);
        if (title === void 0) {
          const first = truncateSummary(stripMarkdown(thinkSummary(rows[0])), 36);
          if (first !== "" && first !== "\u601D\u8003") {
            title = `Think \xB7 ${first}`;
            this.mergedTitles.set(host, title);
          } else {
            title = "\u601D\u8003";
          }
        }
        if (titleEl.textContent !== title) titleEl.textContent = title;
      }
      const expanded = this.mergedExpanded.has(host);
      if (row.getAttribute("aria-expanded") !== String(expanded)) row.setAttribute("aria-expanded", String(expanded));
      const rowWasHidden = row.style.display === "none";
      if (row.style.display !== "") row.style.display = "";
      if (rowWasHidden && animate) this.revealVisual(row);
      for (const r of rows) this.hideElement(r, desiredHidden);
      if (expanded) {
        const result = this.ensureMergedBody(host, row, false);
        if (result !== null && result.created && animate) this.revealMergedBody(result.body);
      }
    }
    /** 展开合并行：直接读各思考行文本合成内容块（不依赖原生行展开：
     * 程序化 click 不触发 React 展开，且后台 tab 的 rAF 不执行）。
     * 返回是否成功——思考行已不可读（parts 为空）时返回 false，调用方
     * 据此保持收起态，避免展开状态与内容块脱节。 */
    expandMergedBody(host, btn) {
      const cached = this.mergedBodyTexts.get(host);
      if (cached === void 0) {
        const parts = this.currentThinkRows(host).map((r) => r.textContent.replace(/^Think\s*/, "").trim()).filter(Boolean);
        if (parts.length === 0) return false;
        this.mergedBodyTexts.set(host, parts.join("\n\n"));
      }
      const result = this.ensureMergedBody(host, btn, true);
      if (result === null) return false;
      if (result.created) {
        this.revealMergedBody(result.body);
      } else {
        this.cancelPendingSync(result.body);
      }
      return true;
    }
    /** 创建/更新合并内容块（缓存优先，不重新展开原生行）。
     * 返回内容块与其是否为本次新建（新建才走展开动画）。 */
    ensureMergedBody(host, btn, force) {
      const cached = this.mergedBodyTexts.get(host);
      if (cached === void 0) return null;
      let body = btn.nextElementSibling;
      let created = false;
      if (body === null || !body.classList.contains("dshcf-merged-body")) {
        const next = document.createElement("div");
        next.className = "dshcf-merged-body";
        btn.after(next);
        body = next;
        created = true;
      }
      if (force || body.textContent !== cached) body.textContent = cached;
      return { body, created };
    }
    /** 清理合并 think 行（v12）：状态 map 立即清除；DOM 在手势动画路径下
     * 渐隐后移除（settle 回调），其余路径瞬删。渐隐中途被反向取消时元素
     * 保留，由后续 pass 的 syncMergedThink 重建/复用。
     * settle 透传给每个渐隐目标的移除回调之后（chip 间距钉住的结算探测点，
     * AI 评审 P0：merged 行渐隐不走 block.rows，必须纳入同一钉住体系）。 */
    releaseMergedThink(host, animate = false, settle) {
      const row = this.mergedThinks.get(host);
      this.mergedExpanded.delete(host);
      this.mergedBodyTexts.delete(host);
      if (row === void 0) return false;
      this.mergedThinks.delete(host);
      const body = row.nextElementSibling;
      const targets = body !== null && body.classList.contains("dshcf-merged-body") ? [row, body] : [row];
      if (animate && this.canAnimate(row)) {
        for (const t of targets) this.startFadeCollapse(t, () => {
          t.remove();
          settle?.();
        });
        return true;
      } else {
        for (const t of targets) t.remove();
        return false;
      }
    }
    /** merged-body 展开高度动画（机制样板：插件全资 DOM）。
     * 关键帧含 marginBottom 0→16px——其 CSS 有常量 margin-bottom:16px，
     * 高度从 0 起步时这 16px 会先占位产生小跳变。fill:'forwards' 托住终态，
     * onfinish 清内联后 cancel 释放，无闪烁窗口。收起由 collapseMergedBody
     * 做镜像高度卷下（同款账本与身份守卫），开合对称。 */
    revealMergedBody(body) {
      if (!this.canAnimate(body)) return;
      this.cancelPendingSync(body);
      const targetHeight = body.getBoundingClientRect().height;
      if (!(targetHeight > 0)) return;
      body.style.height = "0px";
      body.style.overflow = "hidden";
      body.style.marginBottom = "0px";
      const anim = body.animate(
        [
          { height: "0px", marginBottom: "0px" },
          { height: `${targetHeight}px`, marginBottom: "16px" }
        ],
        { duration: ANIM_DURATION_MS, easing: ANIM_EASING, fill: "forwards" }
      );
      const record = { anim, target: "visible", kind: "height" };
      this.pendingAnims.set(body, record);
      anim.onfinish = () => {
        if (this.pendingAnims.get(body) !== record) return;
        this.pendingAnims.delete(body);
        body.style.height = "";
        body.style.overflow = "";
        body.style.marginBottom = "";
        anim.cancel();
        this.schedule();
      };
      anim.oncancel = () => {
        if (this.pendingAnims.get(body) !== record) return;
        this.pendingAnims.delete(body);
      };
    }
    /** 收起合并行：内容块高度卷下后移除——镜像 revealMergedBody 的唯一几何动画，
     * 开合对称。插件全资静态文本 DOM、无 React 协调竞争，可安全做几何收起
     * （与 seat 级拒绝盲卷的场景不同：那里是 React 混杂多卡片）。
     * reduced-motion / 无 WAAPI / 零高度降级为同步 remove()。 */
    collapseMergedBody(host) {
      const btn = this.mergedThinks.get(host);
      if (btn === void 0) return;
      const body = btn.nextElementSibling;
      if (body === null || !body.classList.contains("dshcf-merged-body")) return;
      const el = body;
      if (!this.canAnimate(el)) {
        el.remove();
        return;
      }
      this.cancelPendingSync(el);
      const current = el.getBoundingClientRect().height;
      if (!(current > 0)) {
        el.remove();
        return;
      }
      el.style.height = `${current}px`;
      el.style.overflow = "hidden";
      const anim = el.animate(
        [
          { height: `${current}px`, marginBottom: "16px" },
          { height: "0px", marginBottom: "0px" }
        ],
        { duration: ANIM_DURATION_MS, easing: ANIM_EASING, fill: "forwards" }
      );
      const record = { anim, target: "hidden", kind: "height" };
      this.pendingAnims.set(el, record);
      anim.onfinish = () => {
        if (this.pendingAnims.get(el) !== record) return;
        this.pendingAnims.delete(el);
        el.remove();
        anim.cancel();
        this.schedule();
      };
      anim.oncancel = () => {
        if (this.pendingAnims.get(el) !== record) return;
        this.pendingAnims.delete(el);
        this.clearCollapseLock(el);
      };
    }
    /** 当前宿主内的思考行（现取，React 重渲染后引用仍然有效）。 */
    currentThinkRows(host) {
      return [...host.querySelectorAll('[data-variant="think"]:not([data-tool])')].filter(
        (r) => r.closest("[data-chat-call-id]") === null && r.closest("[data-subcalls]") === null
      );
    }
    /** 移除合并思考行（二级收起 / 一级收起时），恢复行由 applyRows 控制。
     * 合并内容块（btn 的兄弟节点）一并移除，避免宿主展开后残留文本。 */
    removeMergedThink(host) {
      const row = this.mergedThinks.get(host);
      if (row !== void 0) {
        const body = row.nextElementSibling;
        if (body !== null && body.classList.contains("dshcf-merged-body")) body.remove();
        row.remove();
        this.mergedThinks.delete(host);
      }
      this.mergedExpanded.delete(host);
      this.mergedBodyTexts.delete(host);
    }
    /** 正文判定（带缓存）：同一消息子树未变时直接复用上次结果。失效由
     * markDirty（mutation 定向）与 switchFlow（整体重置）驱动；缓存的是
     * 纯文本/媒体存在性判定，与 display 状态无关，插件自身的显隐切换
     * 不会产生脏数据。 */
    hasBodyCached(el) {
      const cached = this.bodyTextCache.get(el);
      if (cached !== void 0) return cached;
      const value = hasBodyContent(el);
      this.bodyTextCache.set(el, value);
      return value;
    }
    /** 本块是否有在途收起渐隐（rows/containers/merged 行/body 任一）。
     * 基于 pendingAnims 账本无状态判定：onfinish/oncancel 都会即时清账，
     * 取消路径天然解锁（计数器/最后注册者会卡死）。merged 行渐隐时已被
     * releaseMergedThink 摘出 mergedThinks，按 DOM 类名现查。 */
    hasPendingCollapse(block) {
      const check = (el) => el !== null && el !== void 0 && this.pendingAnims.get(el)?.target === "hidden";
      if (block.containers.some(check)) return true;
      if (block.rows.some(check)) return true;
      const mergedRow = block.host.querySelector(".dshcf-merged-think");
      if (check(mergedRow)) return true;
      const mergedBody = mergedRow?.nextElementSibling;
      if (mergedBody instanceof HTMLElement && check(mergedBody)) return true;
      return false;
    }
    /** 钉住 chip 与首行的 16px 间距（收起 fade 期间；内联优先于 aria=false 的 0）。
     * flow-chip（context 等 before-mounted）豁免：其间距由宿主 row-gap 16px
     * 提供、自身 CSS 恒 0，钉住 16px 会叠加成 32px（真机实测：收起上下文
     * 注入时二级与三级间距瞬间扩大）。
     */
    pinChipMargin(chip) {
      if (chip.classList.contains("dshcf-flow-chip")) return;
      if (chip.style.marginBottom !== "16px") chip.style.marginBottom = "16px";
    }
    /** 解除钉住（aria=true 的 16px 或 aria=false 的 0 由 CSS 接管）。 */
    unpinChipMargin(chip) {
      if (chip.style.marginBottom !== "") chip.style.marginBottom = "";
    }
    /** 外部介入检测（issue #11 Bug A）：当前内联值 ≠ 插件最后确保值，或所有权
     * 哨兵被 style 整体改写抹除。返回 true 时调用方放弃本次写回并交还账本——
     * 属性级改写由值比对捕获，整体改写（cssText / setAttribute('style')）由
     * 哨兵缺失捕获，两层合起来覆盖外部介入的两种形态。 */
    displayForeign(el) {
      const written = this.writtenDisplay.get(el);
      if (written === void 0) return false;
      return el.style.getPropertyValue(DISPLAY_OWNED_PROP) === "" || el.style.display !== written;
    }
    /** 清空单个元素的显示账本（三账本 + 所有权哨兵）。 */
    releaseDisplayLedger(el) {
      this.originalDisplay.delete(el);
      this.writtenDisplay.delete(el);
      this.controlledDisplay.delete(el);
      el.style.removeProperty(DISPLAY_OWNED_PROP);
    }
    /** 返回 true 表示启动了渐隐动画（调用方可据此决定内部元素的处置）。
     * settle 在渐隐自然结束时调用（onfinish 链；反向取消不触发）。 */
    hideElement(el, desired, animate = false, settle) {
      desired.add(el);
      const pending = this.pendingAnims.get(el);
      if (pending !== void 0) {
        if (pending.target === "hidden") return false;
        this.cancelPendingSync(el);
      }
      if (!this.originalDisplay.has(el) && !isDisplayed(el)) return false;
      if (this.hasAnimatingAncestor(el)) return false;
      if (!this.originalDisplay.has(el) || this.displayForeign(el)) {
        this.originalDisplay.set(el, el.style.display);
        this.writtenDisplay.set(el, el.style.display);
        el.style.setProperty(DISPLAY_OWNED_PROP, "1");
      }
      this.controlledDisplay.add(el);
      if (el.style.display === "none") return false;
      if (animate && this.canAnimate(el)) {
        this.startFadeCollapse(el, settle);
        return true;
      }
      el.style.display = "none";
      this.writtenDisplay.set(el, "none");
      this.displayTouched = true;
      return false;
    }
    restoreElement(el, animate = false) {
      const pending = this.pendingAnims.get(el);
      if (pending !== void 0) {
        if (pending.target === "visible") return;
        this.cancelPendingSync(el);
      }
      if (!this.originalDisplay.has(el)) return;
      if (this.displayForeign(el)) {
        this.releaseDisplayLedger(el);
        return;
      }
      const original = this.originalDisplay.get(el);
      if (!animate || !this.canAnimate(el) || this.hasAnimatingAncestor(el)) {
        if (el.style.display !== original) {
          el.style.display = original;
          this.displayTouched = true;
        }
        this.releaseDisplayLedger(el);
        return;
      }
      if (el.style.display !== original) {
        el.style.display = original;
        this.displayTouched = true;
      }
      this.writtenDisplay.set(el, original);
      this.startReveal(el);
    }
    /** 是否可动画：WAAPI 特性检测 + reduced-motion 门控（均做 typeof 防桩缺失）。 */
    canAnimate(el) {
      if (typeof el.animate !== "function") return false;
      if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
      return true;
    }
    /** 展开方向淡入（opacity + 4px 微位移）：无高度分量、零布局读取。
     * onfinish 按终态可见对齐账本（双删除）并 schedule() 幂等重同步；
     * oncancel 只做身份守卫删除——取消方的终态写入自己负责。 */
    startReveal(el) {
      const anim = el.animate(
        [
          { opacity: "0", transform: "translateY(4px)" },
          { opacity: "1", transform: "translateY(0)" }
        ],
        { duration: ANIM_DURATION_MS, easing: ANIM_EASING }
      );
      const record = { anim, target: "visible", kind: "fade" };
      this.pendingAnims.set(el, record);
      anim.onfinish = () => {
        if (this.pendingAnims.get(el) !== record) return;
        this.pendingAnims.delete(el);
        this.releaseDisplayLedger(el);
        this.schedule();
      };
      anim.oncancel = () => {
        if (this.pendingAnims.get(el) !== record) return;
        this.pendingAnims.delete(el);
      };
    }
    /** 同步取消在途动画并清账：收起动画需同时清锁高内联（height/overflow/
     * marginBottom），否则取消方写完终态后元素仍被锁高裁剪一帧以上。 */
    cancelPendingSync(el) {
      const pending = this.pendingAnims.get(el);
      if (pending === void 0) return;
      pending.anim.cancel();
      this.pendingAnims.delete(el);
      if (pending.kind === "height") this.clearCollapseLock(el);
    }
    clearCollapseLock(el) {
      el.style.height = "";
      el.style.overflow = "";
      el.style.marginBottom = "";
      el.style.boxSizing = "";
    }
    /** 祖先 seat 在途动画检测：沿 parentNode 走到 flow，任一祖先在 pendingAnims
     * 即视为在途。分层规则——同一视觉变化只动画一层。 */
    hasAnimatingAncestor(el) {
      const flow = this.flow;
      if (flow === null) return false;
      let node = el.parentElement;
      while (node !== null && node !== flow) {
        if (this.pendingAnims.has(node)) return true;
        node = node.parentElement;
      }
      return false;
    }
    /** 收起方向渐隐动画（v11 定稿）：镜像 reveal 的 opacity + 4px 微位移，
     * 淡完 onfinish 写 display:none 并保持双条目（镜像 hideElement 终态契约）。
     * fill:'forwards' 占位到终态写入后释放；无几何锁、无 gap 补偿。 */
    startFadeCollapse(el, settle) {
      const anim = el.animate(
        [
          { opacity: "1", transform: "translateY(0)" },
          { opacity: "0", transform: "translateY(4px)" }
        ],
        { duration: ANIM_DURATION_MS, easing: ANIM_EASING, fill: "forwards" }
      );
      const record = { anim, target: "hidden", kind: "fade", settle };
      this.pendingAnims.set(el, record);
      anim.onfinish = () => this.finishFadeCollapse(el, record);
      anim.oncancel = () => {
        if (this.pendingAnims.get(el) !== record) return;
        this.pendingAnims.delete(el);
      };
    }
    /**
     * 收起 fade 终态结算（onfinish 与僵尸收割共用）。仅被同元素新动画
     * supersede 时早退；被 sweep 删账（元素已断连）或收割时仍执行 settle——
     * 回调经 controller 可达，动画必然触发 onfinish，早退会把 chip 内联 16px
     * 钉住永久残留。重挂载同节点不可能（React 只建新节点），重启动的新动画
     * 由第一条守卫覆盖，无误伤。
     */
    finishFadeCollapse(el, record) {
      const cur = this.pendingAnims.get(el);
      if (cur !== void 0 && cur !== record) return;
      this.pendingAnims.delete(el);
      if (this.displayForeign(el)) {
        this.releaseDisplayLedger(el);
        this.schedule();
        record.anim.cancel();
        return;
      }
      if (el.style.display !== "none") el.style.display = "none";
      this.writtenDisplay.set(el, "none");
      record.settle?.();
      record.anim.cancel();
      this.schedule();
    }
    /** 动画是否已播完（终态未结算）：finish 事件丢失时的兜底判定。WAAPI 桩
     * 无 playState/effect 时一律 false，走正常事件路径，测试行为不变。 */
    isAnimOverdue(anim) {
      const a = anim;
      if (a.playState === "finished") return true;
      if (typeof a.currentTime === "number") {
        const end = a.effect?.getComputedTiming?.().endTime;
        if (typeof end === "number" && a.currentTime >= end) return true;
      }
      return false;
    }
    /** 轻量视觉 reveal（opacity + 4px 微位移）：用于插件全资元素的即时显示
     * 路径——chip（一级展开时出现）与 merged-think 行（二级展开时出现）。
     * 这些元素的 display 完全由插件直写、无 React 协调竞争，因此不入
     * pendingAnims 账本、无仲裁；收起同为直写 display:none，无 fill 的在途
     * 动画残留在隐藏元素上自然失效。门控沿用 animate 布尔（手势路径才调）。 */
    revealVisual(el) {
      if (!this.canAnimate(el)) return;
      el.animate(
        [
          { opacity: "0", transform: "translateY(4px)" },
          { opacity: "1", transform: "translateY(0)" }
        ],
        { duration: ANIM_DURATION_MS, easing: ANIM_EASING }
      );
    }
    restoreUnusedDisplays(desired) {
      for (const el of [...this.controlledDisplay]) {
        if (desired.has(el)) continue;
        if (!el.isConnected && this.pendingAnims.get(el)?.target === "hidden") {
          this.releaseDisplayLedger(el);
          continue;
        }
        this.restoreElement(el);
      }
    }
    /** 收集 audit 需要观察的 display 集合；只读取内联样式，不触发布局计算。 */
    collectAuditDisplays(flow) {
      const nodes = new Set(flowItems(flow));
      for (const el of this.controlledDisplay) {
        if (el.isConnected && nodeWithin(el, flow)) nodes.add(el);
      }
      for (const { chip } of this.chips.values()) {
        if (chip.isConnected && nodeWithin(chip, flow)) nodes.add(chip);
      }
      for (const row of this.mergedThinks.values()) {
        if (row.isConnected && nodeWithin(row, flow)) nodes.add(row);
      }
      const displays = /* @__PURE__ */ new Map();
      for (const el of nodes) displays.set(el, el.style.display);
      return displays;
    }
    /** 在完整 pass 完成后保存 display 基线，供下一次轻量 audit 比对。 */
    captureAuditDisplays(flow) {
      this.auditDisplays = this.collectAuditDisplays(flow);
    }
    restoreAllDisplays() {
      for (const el of [...this.controlledDisplay]) this.restoreElement(el);
      this.controlledDisplay.clear();
      this.originalDisplay = /* @__PURE__ */ new WeakMap();
      this.writtenDisplay = /* @__PURE__ */ new WeakMap();
    }
  };
  function createSpan(cls) {
    const span = document.createElement("span");
    span.className = cls;
    return span;
  }
  var COMMAND_ICON_PATHS = [
    {
      transform: "translate(0.6689 1.073)",
      d: "M11.4818 5.57813C11.4818 4.45301 11.4807 3.66237 11.4075 3.05908C11.3359 2.46953 11.2024 2.13852 10.9939 1.89441C10.9247 1.81341 10.8493 1.73801 10.7683 1.66882C10.5242 1.46033 10.1932 1.32686 9.60364 1.25525C9.00034 1.18198 8.20974 1.18091 7.0846 1.18091L5.57813 1.18091C4.45301 1.18091 3.66238 1.18198 3.05908 1.25525C2.46953 1.32686 2.13852 1.46033 1.89441 1.66882C1.81341 1.73801 1.73801 1.81341 1.66882 1.89441C1.46033 2.13852 1.32686 2.46953 1.25525 3.05908C1.18198 3.66238 1.18091 4.45301 1.18091 5.57813L1.18091 6.2771C1.18091 7.40218 1.18197 8.19288 1.25525 8.79614C1.32687 9.38553 1.46036 9.71674 1.66882 9.96082C1.73797 10.0417 1.81347 10.1173 1.89441 10.1864C2.13851 10.3948 2.13965 10.5275 3.05908 10.5991C3.66238 10.6724 4.45298 10.6735 5.57813 10.6735L7.0846 10.6735C8.20977 10.6735 9.00033 10.6724 9.60364 10.5991C10.1931 10.5275 10.5242 10.3948 10.7683 10.1864C10.8493 10.1173 10.9247 10.0417 10.9939 9.96082C11.2024 9.71674 11.3358 9.38553 11.4075 8.79614C11.4808 8.19288 11.4818 7.40218 11.4818 6.2771L11.4818 5.57813ZM12.6627 6.2771C12.6627 7.37222 12.6637 8.247 12.5798 8.93799C12.4942 9.64284 12.3133 10.2359 11.8928 10.7282C11.7834 10.8562 11.6637 10.9751 11.5356 11.0845C11.0434 11.5049 10.4511 11.6867 9.74634 11.7723C9.05525 11.8563 8.17999 11.8552 7.0846 11.8552L5.57813 11.8552C4.48273 11.8552 3.60747 11.8563 2.91638 11.7723C2.21157 11.6867 1.61933 11.5049 1.12708 11.0845C0.99901 10.9751 0.879281 10.8562 0.769898 10.7282C0.349454 10.2359 0.168506 9.64284 0.0828864 8.93799C-0.00101964 8.247 4.88512e-07 7.37222 6.47206e-07 6.2771L6.47206e-07 5.57813C6.47206e-07 4.48273 -0.00106163 3.60747 0.0828864 2.91638C0.168502 2.21168 0.349594 1.61928 0.769898 1.12708C0.879302 0.998981 0.998981 0.879302 1.12708 0.769898C1.61928 0.349594 2.21168 0.168502 2.91638 0.0828864C3.60747 -0.00106163 4.48273 6.47206e-07 5.57813 6.47206e-07L7.0846 6.47206e-07C8.17999 6.47206e-07 9.05525 -0.00106163 9.74634 0.0828864C10.451 0.168505 11.0434 0.349587 11.5356 0.769898C11.6637 0.879302 11.7834 0.998981 11.8928 1.12708C12.3131 1.61928 12.4942 2.21169 12.5798 2.91638C12.6638 3.60747 12.6627 4.48273 12.6627 5.57813L12.6627 6.2771Z"
    },
    {
      transform: "translate(0.6689 1.073)",
      d: "M6.02607 5.50955L6.44306 5.9274L3.84284 8.52762L3.425 8.11063L3.00715 7.69278L4.77253 5.9274L3.00715 4.16202L3.84284 3.32633L6.02607 5.50955Z"
    },
    {
      transform: "translate(0.6689 1.073)",
      d: "M9.23789 7.35397L9.23789 8.53488L6.96238 8.53488L6.96238 7.35397L9.23789 7.35397Z"
    }
  ];
  var NATIVE_CHEVRON_DOWN_PATH = "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z";
  function createChevronIcon(className) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("class", className);
    svg.setAttribute("viewBox", "0 0 14 14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", NATIVE_CHEVRON_DOWN_PATH);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }
  var THINK_ICON_PATHS = [
    {
      d: "M7.06431 5.93342C7.68763 5.93342 8.19307 6.43904 8.19322 7.06233C8.19322 7.68573 7.68772 8.19123 7.06431 8.19123C6.44099 8.19113 5.9354 7.68567 5.9354 7.06233C5.93555 6.43911 6.44108 5.93353 7.06431 5.93342Z"
    },
    {
      evenodd: true,
      d: "M8.6815 0.963693C10.1169 0.447019 11.6266 0.374829 12.5633 1.31135C13.5 2.24805 13.4277 3.75776 12.911 5.19319C12.7126 5.74431 12.4386 6.31796 12.0965 6.89729C12.4969 7.54638 12.8141 8.19018 13.036 8.80647C13.5527 10.2419 13.6251 11.7516 12.6883 12.6883C11.7516 13.625 10.242 13.5527 8.8065 13.036C8.19022 12.8141 7.54641 12.4969 6.89732 12.0965C6.31797 12.4386 5.74435 12.7125 5.19322 12.911C3.75777 13.4276 2.2481 13.5 1.31138 12.5633C0.374859 11.6266 0.447049 10.1168 0.963724 8.68147C1.17185 8.10338 1.46321 7.50063 1.82896 6.8924C1.52182 6.35711 1.27235 5.82825 1.08872 5.31819C0.572068 3.88278 0.499714 2.37306 1.43638 1.43635C2.37308 0.499655 3.8828 0.572044 5.31822 1.08869C5.82828 1.27232 6.35715 1.5218 6.89243 1.82893C7.50066 1.46318 8.10341 1.17181 8.6815 0.963693ZM11.3573 8.01154C10.9083 8.62253 10.3901 9.22873 9.80943 9.8094C9.22877 10.3901 8.62255 10.9083 8.01158 11.3572C8.4257 11.5841 8.8287 11.7688 9.21275 11.9071C10.5456 12.3868 11.4246 12.2547 11.8397 11.8397C12.2548 11.4246 12.3869 10.5456 11.9071 9.21272C11.7688 8.82866 11.5841 8.42568 11.3573 8.01154ZM2.56529 8.02912C2.37344 8.39322 2.21495 8.74796 2.09263 9.08772C1.61291 10.4204 1.74512 11.2995 2.16001 11.7147C2.57505 12.1297 3.45415 12.2618 4.78697 11.7821C5.11057 11.6656 5.44786 11.5164 5.7938 11.3367C5.249 10.9223 4.70922 10.4533 4.19029 9.9344C3.57578 9.31987 3.03169 8.67633 2.56529 8.02912ZM6.90708 3.2469C6.24065 3.70479 5.5646 4.26321 4.91392 4.91389C4.26325 5.56456 3.70482 6.24063 3.24693 6.90705C3.72674 7.63325 4.32777 8.37459 5.03892 9.08576C5.64943 9.69627 6.28183 10.2265 6.90806 10.6678C7.59368 10.2025 8.2908 9.63076 8.96079 8.96076C9.6308 8.29075 10.2025 7.59366 10.6678 6.90803C10.2265 6.2818 9.69631 5.6494 9.08579 5.03889C8.37462 4.32773 7.63328 3.72672 6.90708 3.2469ZM11.7147 2.15998C11.2996 1.74509 10.4204 1.61288 9.08775 2.0926C8.74835 2.21479 8.39382 2.37271 8.03013 2.56428C8.67728 3.03065 9.31995 3.5758 9.93443 4.19026C10.4534 4.7092 10.9223 5.24896 11.3368 5.79377C11.5164 5.44785 11.6656 5.11052 11.7821 4.78694C12.2618 3.45416 12.1297 2.57502 11.7147 2.15998ZM4.91197 2.2176C3.57922 1.73788 2.70004 1.86995 2.28501 2.28498C1.87001 2.70003 1.73791 3.5792 2.21763 4.91194C2.31709 5.18822 2.44112 5.47427 2.58677 5.7674C3.01931 5.1887 3.51474 4.6158 4.06529 4.06526C4.61584 3.5147 5.18872 3.01928 5.76743 2.58674C5.47431 2.4411 5.18824 2.31706 4.91197 2.2176Z"
    }
  ];
  function findNativeThinkSvg() {
    for (const drow of document.querySelectorAll('[data-variant="think"] [data-disclosure-row]')) {
      for (const svg of drow.querySelectorAll("svg")) {
        if (svg.querySelectorAll("path").length >= 2) return svg;
      }
    }
    return null;
  }
  function createThinkIcon() {
    const native = findNativeThinkSvg();
    if (native !== null) return native.cloneNode(true);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 14 14");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    for (const p of THINK_ICON_PATHS) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      if (p.evenodd === true) {
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute("clip-rule", "evenodd");
      }
      path.setAttribute("d", p.d);
      path.setAttribute("fill", "currentColor");
      svg.appendChild(path);
    }
    return svg;
  }
  function findNativeCommandSvg() {
    const selector = '[data-chat-call-id] [data-disclosure-row], [data-chat-flow-kind="command"] [data-disclosure-row], [data-chat-flow-kind="manual-compaction"] [data-disclosure-row]';
    for (const drow of document.querySelectorAll(selector)) {
      for (const svg of drow.querySelectorAll("svg")) {
        if (svg.querySelectorAll("path").length === 3 && isIcon14(svg)) return svg;
      }
    }
    return null;
  }
  function isIcon14(svg) {
    if (svg.getAttribute("width") === "14" && svg.getAttribute("height") === "14") return true;
    const vb = (svg.getAttribute("viewBox") ?? "").trim().split(/\s+/);
    return vb.length === 4 && Number(vb[2]) === 14 && Number(vb[3]) === 14;
  }
  var cachedNativeCommandSvg = null;
  function createCommandIcon() {
    if (cachedNativeCommandSvg !== null) return cachedNativeCommandSvg.cloneNode(true);
    const native = findNativeCommandSvg();
    if (native !== null) {
      cachedNativeCommandSvg = native;
      return native.cloneNode(true);
    }
    return createCommandIconFallback();
  }
  function createCommandIconFallback() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 14 14");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    for (const p of COMMAND_ICON_PATHS) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("transform", p.transform);
      path.setAttribute("d", p.d);
      path.setAttribute("fill", "currentColor");
      svg.appendChild(path);
    }
    return svg;
  }
  var CONTEXT_ICON_PATHS = [
    {
      d: "M11.2426 4.80473V6.10551H4.75819V4.80473H11.2426Z"
    },
    {
      d: "M9.40858 7.84478V9.14557H4.75819V7.84478H9.40858Z"
    },
    {
      d: "M9.23438 0.546389C10.1941 0.546389 10.9683 0.544914 11.5859 0.611819C12.2161 0.680096 12.7634 0.825745 13.2393 1.17139C13.5172 1.3733 13.7619 1.61812 13.9639 1.896C14.3096 2.37183 14.4551 2.91922 14.5234 3.54932C14.5903 4.16686 14.5889 4.94133 14.5889 5.90088V10.0981C14.5889 11.0576 14.5903 11.8321 14.5234 12.4497C14.4552 13.0798 14.3094 13.6272 13.9639 14.103C13.7619 14.381 13.5172 14.6257 13.2393 14.8276C12.7633 15.1734 12.2163 15.3189 11.5859 15.3872C10.9683 15.4541 10.1942 15.4536 9.23438 15.4536H6.76563C5.80591 15.4536 5.03168 15.4541 4.41407 15.3872C3.78385 15.3189 3.23665 15.1734 2.76074 14.8276C2.48291 14.6257 2.23802 14.3809 2.03614 14.103C1.69066 13.6272 1.54483 13.0798 1.47657 12.4497C1.40973 11.8321 1.41114 11.0576 1.41114 10.0981V5.90088C1.41113 4.94132 1.40966 4.16686 1.47657 3.54932C1.54488 2.91921 1.69042 2.37184 2.03614 1.896C2.2381 1.61807 2.4828 1.37333 2.76074 1.17139C3.23665 0.825682 3.78386 0.680109 4.41407 0.611819C5.03168 0.544905 5.80591 0.546389 6.76563 0.546389H9.23438ZM6.76563 1.896C5.77586 1.896 5.0876 1.89738 4.55957 1.95459C4.0443 2.01043 3.76214 2.11349 3.55469 2.26416C3.39135 2.38284 3.24761 2.52662 3.12891 2.68994C2.97821 2.89736 2.8752 3.17967 2.81934 3.69483C2.76214 4.22279 2.76075 4.91131 2.76074 5.90088V10.0981C2.76074 11.0876 2.76221 11.7762 2.81934 12.3042C2.87516 12.8194 2.97829 13.1026 3.12891 13.3101C3.24754 13.4733 3.39147 13.6172 3.55469 13.7358C3.76213 13.8865 4.04438 13.9896 4.55957 14.0454C5.0876 14.1026 5.77586 14.103 6.76563 14.103H9.23438C10.2242 14.103 10.9124 14.1026 11.4404 14.0454C11.9556 13.9896 12.2379 13.8865 12.4453 13.7358C12.6086 13.6172 12.7525 13.4733 12.8711 13.3101C13.0217 13.1026 13.1248 12.8195 13.1807 12.3042C13.2378 11.7762 13.2393 11.0876 13.2393 10.0981V5.90088C13.2393 4.91131 13.2379 4.22279 13.1807 3.69483C13.1248 3.17969 13.0218 2.89736 12.8711 2.68994C12.7524 2.52667 12.6086 2.38281 12.4453 2.26416C12.2379 2.11355 11.9556 2.01041 11.4404 1.95459C10.9124 1.8974 10.2241 1.896 9.23438 1.896H6.76563Z"
    }
  ];
  function findNativeContextSvg() {
    for (const ctx of document.querySelectorAll('[data-chat-flow-kind="context"]')) {
      const drow = ctx.querySelector("[data-disclosure-row]");
      if (drow === null) continue;
      for (const svg of drow.querySelectorAll("svg")) {
        if (svg.querySelectorAll("path").length >= 2) return svg;
      }
    }
    return null;
  }
  function createContextIcon() {
    const native = findNativeContextSvg();
    if (native !== null) return native.cloneNode(true);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    for (const p of CONTEXT_ICON_PATHS) {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", p.d);
      path.setAttribute("fill", "currentColor");
      svg.appendChild(path);
    }
    return svg;
  }
  var WRITE_ICON_PATH = "M9.94076 1.34942C10.7047 0.90231 11.6503 0.902415 12.4143 1.34942C12.7061 1.52015 12.9688 1.79118 13.3104 2.13284C13.6521 2.47448 13.9231 2.73721 14.0939 3.02894C14.5408 3.79294 14.5409 4.73856 14.0939 5.50251C13.9231 5.79415 13.652 6.05704 13.3104 6.39861L6.65932 13.0497C6.28068 13.4284 6.00695 13.7108 5.66543 13.9097C5.32391 14.1085 4.94315 14.2074 4.42705 14.3498L3.24394 14.6761C2.77527 14.8054 2.34538 14.9262 2.00131 14.9684C1.65196 15.0112 1.17964 15.0013 0.810764 14.6325C0.441921 14.2637 0.432107 13.7913 0.47486 13.442C0.517035 13.0979 0.6379 12.668 0.767181 12.1993L1.09352 11.0162C1.23588 10.5001 1.33481 10.1193 1.5336 9.77784C1.7325 9.43632 2.0149 9.1626 2.39355 8.78395L9.04466 2.13284C9.38625 1.79126 9.64911 1.52016 9.94076 1.34942ZM15.5427 14.8398H7.55223L8.96707 13.425H15.5427V14.8398ZM3.39382 9.78422C2.965 10.213 2.84244 10.3436 2.75709 10.49C2.67183 10.6366 2.61862 10.8079 2.45733 11.3925L2.13099 12.5756C2.00183 13.0439 1.92194 13.3419 1.88863 13.5536C2.10041 13.5204 2.39872 13.4416 2.86764 13.3123L4.05075 12.9859C4.63544 12.8246 4.80669 12.7715 4.95323 12.6862C5.09968 12.6008 5.23022 12.4783 5.65905 12.0494L10.721 6.98644L8.45577 4.72121L3.39382 9.78422ZM11.7 2.57079C11.3774 2.38198 10.9777 2.38198 10.6551 2.57079C10.5602 2.62647 10.4487 2.72931 10.0449 3.13311L9.45604 3.72094L11.7213 5.98617L12.3102 5.39833C12.7139 4.99457 12.8168 4.88307 12.8725 4.78818C13.0613 4.46561 13.0612 4.06585 12.8725 3.74326C12.8169 3.64827 12.7146 3.53752 12.3102 3.13311C11.9057 2.72863 11.795 2.6264 11.7 2.57079Z";
  function findNativeWriteSvg() {
    const selector = '[data-tool="write"] [data-disclosure-row], [data-tool="edit"] [data-disclosure-row]';
    for (const drow of document.querySelectorAll(selector)) {
      for (const svg of drow.querySelectorAll("svg")) {
        if (svg.querySelectorAll("path").length === 1 && isIcon16(svg)) return svg;
      }
    }
    return null;
  }
  function isIcon16(svg) {
    const vb = (svg.getAttribute("viewBox") ?? "").trim().split(/\s+/);
    return vb.length === 4 && Number(vb[2]) === 16 && Number(vb[3]) === 16;
  }
  function createWriteIcon() {
    const native = findNativeWriteSvg();
    if (native !== null) return native.cloneNode(true);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", WRITE_ICON_PATH);
    path.setAttribute("fill", "currentColor");
    svg.appendChild(path);
    return svg;
  }
  function syncLeadingIcon(chip, kind) {
    const leading = chip.querySelector(".dshcf-leading");
    if (leading === null) return;
    const existing = leading.querySelector("svg");
    if (existing !== null && existing.getAttribute("data-dshcf-icon") === kind) return;
    for (const child of [...leading.childNodes]) child.remove();
    const svg = kind === "think" ? createThinkIcon() : kind === "context" ? createContextIcon() : kind === "write" ? createWriteIcon() : createCommandIcon();
    svg.setAttribute("data-dshcf-icon", kind);
    leading.appendChild(svg);
  }
  function findFlow() {
    const flows = document.querySelectorAll("[data-chat-flow]");
    for (const flow of flows) {
      if (flow.offsetParent !== null || flow.getBoundingClientRect().width > 0) return flow;
    }
    return flows[0] ?? null;
  }
  function nodeWithin(node, ancestor) {
    for (let current = node; current !== null; current = current.parentNode) {
      if (current === ancestor) return true;
    }
    return false;
  }
  function isPluginOwnedNode(node) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    return element !== null && element !== void 0 && element.closest(".dshcf-chip, .dshcf-processed, .dshcf-merged-think, .dshcf-merged-body") !== null;
  }
  function flowChildOwner(node, flow) {
    let current = node;
    while (current !== null && current.parentNode !== flow) current = current.parentNode;
    return current instanceof HTMLElement ? current : null;
  }
  function flowItems(flow) {
    return [...flow.children].filter((el) => el instanceof HTMLElement && !el.classList.contains("dshcf-processed") && !el.classList.contains("dshcf-flow-chip"));
  }
  function isDisplayed(el) {
    if (typeof getComputedStyle === "function") return getComputedStyle(el).display !== "none";
    return el.style.display !== "none";
  }
  function buildNativeTurnMap(flow) {
    const states = /* @__PURE__ */ new Map();
    for (const el of flow.children) {
      if (!(el instanceof HTMLElement)) continue;
      if (el.getAttribute("data-chat-flow-kind") !== TURN_PROCESS_KIND) continue;
      const turn = el.getAttribute("data-chat-turn");
      if (turn === null || turn === "") continue;
      const button = el.querySelector("button[data-turn-process]");
      if (button === null) continue;
      const openAttr = button.getAttribute(NATIVE_OPEN_ATTR) !== null;
      const expandedAttr = button.getAttribute("aria-expanded");
      const open = expandedAttr === null ? openAttr : expandedAttr === "true";
      states.set(turn, { collapsed: !open });
    }
    return states;
  }
  function elementTurn(el) {
    const turn = el.getAttribute("data-chat-turn");
    return turn === null || turn === "" ? null : turn;
  }
  function segmentHasNativeTurn(segment, nativeTurns) {
    if (nativeTurns.size === 0) return false;
    for (const block of segment.blocks) {
      const turn = elementTurn(block.host);
      if (turn !== null && nativeTurns.has(turn)) return true;
    }
    return false;
  }
  function blockNativelyCollapsed(block, nativeTurns) {
    if (nativeTurns.size === 0) return false;
    const turn = elementTurn(block.host);
    return turn !== null && nativeTurns.get(turn)?.collapsed === true;
  }
  function stableElementKey(el, fallbackIndex) {
    const kind = el.getAttribute("data-chat-flow-kind") ?? "node";
    const key = el.getAttribute("data-chat-flow-key") ?? el.getAttribute("data-chat-anchor-key") ?? `${kind}:${fallbackIndex}`;
    return `${kind}:${key}`;
  }
  function hasLeadingTurnWork(items) {
    return items.some((el) => {
      const kind = el.getAttribute("data-chat-flow-kind");
      return kind === "assistant-step" || kind === "assistant" || kind === "tool-call" || kind === "command" || kind === "manual-compaction";
    });
  }
  function buildSegments(flow, blocks, hasBody) {
    const items = flowItems(flow);
    const itemIndex = new Map(items.map((el, index) => [el, index]));
    const snapshots = [];
    let contentStart = 0;
    let startMarker = null;
    const append = (end, boundary, closed) => {
      if (end < contentStart) return;
      const range = items.slice(contentStart, end);
      const inRange = new Set(range);
      const segmentBlocks = blocks.filter((block) => inRange.has(block.host));
      const bodySteps = range.filter((el) => {
        const kind = el.getAttribute("data-chat-flow-kind");
        return (kind === "assistant-step" || kind === "assistant") && hasBody(el);
      });
      const finalStep = bodySteps.length > 0 ? bodySteps[bodySteps.length - 1] : null;
      const middleSteps = new Set(bodySteps.slice(0, -1));
      const workHosts = /* @__PURE__ */ new Set([
        ...segmentBlocks.map((block) => block.host),
        ...middleSteps
      ]);
      const firstWork = range.find((el) => workHosts.has(el)) ?? finalStep;
      const identity = startMarker ?? range.find((el) => hasLeadingTurnWork([el])) ?? boundary;
      const identityIndex = identity === null ? contentStart : itemIndex.get(identity) ?? contentStart;
      const prefix = startMarker === null ? "leading" : "segment";
      const key = `${prefix}:${identity === null ? `open:${contentStart}` : stableElementKey(identity, identityIndex)}`;
      snapshots.push({
        key,
        boundary,
        startMarker,
        blocks: segmentBlocks,
        middleSteps,
        finalStep,
        firstWork,
        closed,
        running: segmentBlocks.some((block) => block.rows.some((row) => rowState(row) === "running")),
        hasWork: segmentBlocks.length > 0 || middleSteps.size > 0
      });
    };
    for (let index = 0; index < items.length; index++) {
      const el = items[index];
      const kind = el.getAttribute("data-chat-flow-kind");
      if (kind === "user" || kind === "steering") {
        if (startMarker !== null) {
          append(index, el, true);
          contentStart = index + 1;
        } else {
          const leading = items.slice(contentStart, index);
          if (hasLeadingTurnWork(leading)) {
            append(index, el, true);
            contentStart = index + 1;
          }
        }
        startMarker = el;
        continue;
      }
      if (kind === "turn-tail") {
        append(index, el, true);
        contentStart = index + 1;
        startMarker = null;
      }
    }
    if (contentStart < items.length) append(items.length, null, false);
    return snapshots;
  }
  function hasVisibleSegmentWork(segment) {
    const workHosts = /* @__PURE__ */ new Set([
      ...segment.blocks.map((block) => block.host),
      ...segment.middleSteps
    ]);
    if (segment.startMarker !== null) workHosts.add(segment.startMarker);
    if (segment.finalStep !== null) workHosts.add(segment.finalStep);
    return [...workHosts].some(isDisplayed);
  }
  function findBlocks(flow, hasBody) {
    const blocks = [];
    const children = flowItems(flow);
    let run = null;
    let carry = [];
    let carryHost = null;
    const makeBlock = (host, category) => {
      const block = {
        key: "",
        host,
        rows: [],
        containers: [],
        mount: "inside",
        category
      };
      blocks.push(block);
      return block;
    };
    const flushCarry = () => {
      if (carry.length === 0 || carryHost === null) return;
      let own = blocks.find((block) => block.host === carryHost && block.category === "work");
      if (own === void 0) own = makeBlock(carryHost, "work");
      own.rows.push(...carry);
      carry = [];
      carryHost = null;
    };
    for (const el of children) {
      const kind = el.getAttribute("data-chat-flow-kind");
      if (kind === TURN_PROCESS_KIND) continue;
      if (kind === "user" || kind === "steering" || kind === "turn-tail") {
        flushCarry();
        run = null;
        continue;
      }
      const thinkRows = thinkRowsIn(el);
      const workRows = [...callRowsIn(el), ...commandRowsIn(el)];
      const isToolPile = workRows.length > 0;
      const isContext = kind === "context";
      const msgHasBody = !isToolPile ? hasBody(el) : false;
      if (isContext) {
        flushCarry();
        if (run === null || run.category !== "context") run = makeBlock(el, "context");
        run.rows.push(el);
        run.mount = "before";
        continue;
      }
      if (isToolPile || thinkRows.length > 0 && !msgHasBody) {
        if (run === null || run.category !== "work") run = makeBlock(el, "work");
        if (carry.length > 0) {
          run.rows.push(...carry);
          carry = [];
          carryHost = null;
        }
        run.rows.push(...thinkRows, ...workRows);
        if (el !== run.host && !workRows.includes(el)) {
          run.containers.push(el);
        }
        if (workRows.includes(el)) run.mount = "before";
      } else if (el.hasAttribute("data-chat-anchor-key") && (thinkRows.length > 0 || msgHasBody) || msgHasBody && kind !== null) {
        flushCarry();
        if (thinkRows.length > 0) {
          const segments = splitThinkByBody(el, thinkRows);
          if (run === null || run.category !== "work") run = makeBlock(el, "work");
          run.rows.push(...segments[0]);
          carry = segments.slice(1).flat();
          carryHost = el;
        }
        run = null;
      } else if (kind !== null && kind !== "assistant-step" && kind !== "assistant") {
        flushCarry();
        run = null;
      }
    }
    flushCarry();
    const indexByHost = new Map(children.map((el, index) => [el, index]));
    const counts = /* @__PURE__ */ new Map();
    for (const block of blocks) {
      block.mount = block.rows.includes(block.host) ? "before" : block.mount;
      const base = `${stableElementKey(block.host, indexByHost.get(block.host) ?? 0)}:${block.category}`;
      const ordinal = counts.get(base) ?? 0;
      counts.set(base, ordinal + 1);
      block.key = `${base}:block:${ordinal}`;
    }
    return blocks;
  }
  function splitThinkByBody(el, rows) {
    const texts = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) !== null) {
      if (node.data.trim() === "") continue;
      const parent = node.parentElement;
      if (parent !== null && parent.closest('[data-variant="think"], [data-chat-call-id], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body') !== null) continue;
      texts.push(node);
    }
    const hasBetween = (a, b) => {
      for (const t of texts) {
        const posA = a.compareDocumentPosition(t);
        if ((posA & Node.DOCUMENT_POSITION_FOLLOWING) === 0) continue;
        const posB = b.compareDocumentPosition(t);
        return (posB & Node.DOCUMENT_POSITION_PRECEDING) !== 0;
      }
      return false;
    };
    const segments = [];
    let current = [];
    for (let i = 0; i < rows.length; i++) {
      current.push(rows[i]);
      if (i + 1 < rows.length && hasBetween(rows[i], rows[i + 1])) {
        segments.push(current);
        current = [];
      }
    }
    if (current.length > 0) segments.push(current);
    return segments.length > 0 ? segments : [rows];
  }
  function hasBodyText(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) !== null) {
      if (node.data.trim() === "") continue;
      const parent = node.parentElement;
      if (parent !== null && parent.closest('[data-variant="think"], [data-chat-call-id], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body') !== null) continue;
      return true;
    }
    return false;
  }
  function hasBodyContent(el) {
    const kind = el.getAttribute("data-chat-flow-kind");
    if (kind === "command" || kind === "manual-compaction") return false;
    if (hasBodyText(el)) return true;
    const excluded = '[data-variant="think"], [data-chat-call-id], [data-variant="others"][data-state], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body';
    for (const media of el.querySelectorAll("img, video, audio, canvas")) {
      if (media.closest(excluded) === null) return true;
    }
    return false;
  }
  function thinkRowsIn(el) {
    const rows = [];
    for (const row of el.querySelectorAll('[data-variant="think"]:not([data-tool])')) {
      if (row.closest("[data-chat-call-id]") !== null) continue;
      if (row.closest("[data-subcalls]") !== null) continue;
      rows.push(row);
    }
    return rows;
  }
  function callRowsIn(el) {
    const rows = [];
    for (const row of el.querySelectorAll("[data-chat-call-id]")) {
      if (row.closest("[data-subcalls]") !== null) continue;
      if (row.closest("[data-chat-call-id]") !== row) continue;
      rows.push(row);
    }
    return rows;
  }
  function commandRowsIn(el) {
    const kind = el.getAttribute("data-chat-flow-kind");
    if (kind !== "command" && kind !== "manual-compaction") return [];
    const rows = [];
    for (const row of el.querySelectorAll('[data-variant="others"][data-state]')) {
      const parent = row.parentElement?.closest('[data-variant="others"][data-state]');
      if (parent !== null && parent !== void 0 && parent !== row) continue;
      rows.push(row);
    }
    return rows.length > 0 ? rows : [el];
  }
  function deriveRowInfo(row) {
    const isThink = row.matches('[data-variant="think"]') && !row.hasAttribute("data-tool");
    if (isThink) {
      return { kind: "think", label: "Think", summary: thinkSummary(row), state: row.getAttribute("data-state") ?? "ok" };
    }
    if (row.getAttribute("data-chat-flow-kind") === "context") {
      return { kind: "tool", label: "\u4E0A\u4E0B\u6587\u6CE8\u5165", summary: toolSummary(row), state: "ok" };
    }
    const commandSeat = row.closest('[data-chat-flow-kind="command"], [data-chat-flow-kind="manual-compaction"]');
    if (commandSeat !== null) {
      const commandKind = commandSeat.getAttribute("data-chat-flow-kind");
      return {
        kind: "tool",
        label: commandKind === "manual-compaction" ? "Compact" : "Command",
        summary: toolSummary(row),
        state: row.getAttribute("data-state") ?? "ok"
      };
    }
    const root = row.querySelector("[data-tool]") ?? row;
    const tool = root.getAttribute("data-tool") ?? "";
    const state = root.getAttribute("data-state") ?? "ok";
    const label = TOOL_LABELS[tool] ?? tool;
    return { kind: "tool", label: label !== "" ? label : "Tool", summary: toolSummary(row), state };
  }
  function thinkSummary(row) {
    const follow = row.querySelector("[data-follow-end]");
    if (follow !== null) {
      const text = (follow.textContent ?? "").trim();
      if (text !== "") return text;
    }
    return summaryFallback(row);
  }
  function toolSummary(row) {
    const drow = row.querySelector("[data-disclosure-row]");
    if (drow !== null) {
      const children = [...drow.children].filter((el) => el instanceof HTMLElement);
      for (const child of children.slice(2)) {
        const text = (child.textContent ?? "").trim();
        if (text !== "") return text;
      }
    }
    return summaryFallback(row);
  }
  function summaryFallback(row) {
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    let best = "";
    let node;
    while ((node = walker.nextNode()) !== null) {
      if (node.parentElement?.closest('[data-open="true"]') !== null) continue;
      const text = node.data.trim();
      if (text === "") continue;
      if (text.length > best.length) best = text;
    }
    return best;
  }
  function deriveBlockInfo(rows) {
    const infos = rows.map(deriveRowInfo);
    const runningTool = infos.find((i) => i.kind === "tool" && i.state === "running") ?? null;
    const runningThink = infos.find((i) => i.kind === "think" && i.state === "running") ?? null;
    const tools = [...new Set(infos.filter((i) => i.kind === "tool").map((i) => i.label))];
    return {
      runningTool,
      runningThink,
      tools,
      hasError: infos.some((i) => i.state === "error"),
      hasStopped: infos.some((i) => i.state === "stopped"),
      allContext: infos.length > 0 && infos.every((i) => i.label === "\u4E0A\u4E0B\u6587\u6CE8\u5165")
    };
  }
  function updateChip(chip, rows, expanded) {
    const info = deriveBlockInfo(rows);
    const title = chip.querySelector(".dshcf-chip-title");
    const summary = chip.querySelector(".dshcf-chip-summary");
    const sep = chip.querySelector(".dshcf-chip-sep");
    if (title === null || summary === null) return;
    const running = info.runningTool ?? info.runningThink;
    const collapsed = !expanded;
    let titleText;
    let summaryText;
    if (info.runningTool !== null) {
      titleText = "\u6B63\u5728\u8FD0\u884C";
      summaryText = collapsed ? info.runningTool.summary : "";
    } else if (info.runningThink !== null) {
      titleText = "\u6B63\u5728\u601D\u8003";
      summaryText = collapsed ? info.runningThink.summary : "";
    } else if (info.tools.length > 0) {
      titleText = info.allContext ? "\u4E0A\u4E0B\u6587\u6CE8\u5165" : info.tools.some((tool) => tool === "Edit" || tool === "Write") ? "\u7F16\u8F91\u4E86\u6587\u4EF6" : "\u8FD0\u884C\u4E86\u547D\u4EE4";
      summaryText = "";
    } else {
      titleText = "\u5DF2\u601D\u8003";
      summaryText = "";
    }
    let kind = running !== null ? running.kind : info.allContext ? "context" : info.tools.length > 0 ? "tool" : "think";
    if (running === null && info.tools.some((tool) => tool === "Edit" || tool === "Write")) kind = "write";
    if (title.textContent !== titleText) title.textContent = titleText;
    if (summary.textContent !== summaryText) summary.textContent = summaryText;
    if (sep !== null) {
      const sepDisplay = summaryText === "" ? "none" : "";
      if (sep.style.display !== sepDisplay) sep.style.display = sepDisplay;
    }
    if (running !== null) {
      summary.scrollLeft = summary.scrollWidth - summary.clientWidth;
    } else if (chip.classList.contains("running") && summary.scrollLeft !== 0) {
      summary.scrollLeft = 0;
    }
    const expandedAttr = String(expanded);
    if (chip.getAttribute("aria-expanded") !== expandedAttr) {
      chip.setAttribute("aria-expanded", expandedAttr);
    }
    if (chip.dataset.kind !== kind) {
      chip.dataset.kind = kind;
      syncLeadingIcon(chip, kind);
    }
    const tip = expanded ? "\u6536\u8D77\u8FD9\u4E9B\u5361\u7247" : "\u5C55\u5F00\u8FD9\u4E9B\u5361\u7247";
    if (chip.title !== tip) chip.title = tip;
    setClass(chip, "running", running !== null);
    setClass(chip, "error", !running && info.hasError);
    setClass(chip, "stopped", !running && info.hasStopped && !info.hasError);
  }
  function setClass(el, cls, on) {
    if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
  }
  function truncateSummary(text, max) {
    const t = text.replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max) + "\u2026" : t;
  }
  function stripMarkdown(text) {
    return text.replace(/\*\*/g, "").replace(/^#{1,3}\s+/, "").trim();
  }
  function isThinkRow(row) {
    return row.matches('[data-variant="think"]') && !row.hasAttribute("data-tool");
  }
  var turnDurationCache = /* @__PURE__ */ new WeakMap();
  function parseTurnDuration(boundary) {
    const text = boundary.textContent ?? "";
    const cached = turnDurationCache.get(boundary);
    if (cached !== void 0 && cached.text === text) return cached.duration;
    const duration = parseTurnDurationText(boundary, text);
    turnDurationCache.set(boundary, { text, duration });
    return duration;
  }
  function parseTurnDurationText(boundary, text) {
    const m = text.match(/用时\s*(\d+)分(\d+)秒|用时\s*(\d+)秒/);
    if (m !== null) {
      if (m[1] !== void 0 && m[2] !== void 0) return Number(m[1]) * 6e4 + Number(m[2]) * 1e3;
      if (m[3] !== void 0) return Number(m[3]) * 1e3;
      return void 0;
    }
    const end = parseTimeText(text);
    const start = findTurnStart(boundary);
    if (end !== void 0 && start !== void 0 && end > start) return end - start;
    return void 0;
  }
  function parseTimeText(text) {
    const m = text.match(/(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/);
    if (m === null) return void 0;
    const year = m[1] !== void 0 ? Number(m[1]) : (/* @__PURE__ */ new Date()).getFullYear();
    const t = new Date(year, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])).getTime();
    return Number.isNaN(t) ? void 0 : t;
  }
  function findTurnStart(boundary) {
    const flow = boundary.parentElement;
    if (flow === null) return void 0;
    let best = null;
    for (const s of flow.querySelectorAll('[class*="timeStart"]')) {
      const pos = s.compareDocumentPosition(boundary);
      if ((pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 || (pos & Node.DOCUMENT_POSITION_CONTAINED_BY) !== 0 || s === boundary) best = s;
      else break;
    }
    if (best === null) return void 0;
    return parseTimeText(best.textContent ?? "");
  }
  function rowState(row) {
    if (row.matches('[data-variant="think"]') && !row.hasAttribute("data-tool")) {
      return row.getAttribute("data-state") ?? "ok";
    }
    const root = row.querySelector("[data-tool]") ?? row;
    return root.getAttribute("data-state") ?? "ok";
  }
  function createProcessedRowElement(duration) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dshcf-processed";
    btn.setAttribute("aria-expanded", "false");
    const text = document.createElement("span");
    text.textContent = duration !== void 0 ? `\u5DF2\u5904\u7406 ${formatDuration(duration)}` : "\u5DF2\u5904\u7406";
    const chevron = createChevronIcon("dshcf-processed-chevron");
    btn.append(text, chevron);
    btn.title = "\u5C55\u5F00\u5DE5\u4F5C\u8FC7\u7A0B";
    return btn;
  }
  function formatDuration(ms) {
    const s = Math.round(ms / 1e3);
    if (s < 60) return `${s}\u79D2`;
    const h = Math.floor(s / 3600);
    const m = Math.floor(s % 3600 / 60);
    const r = s % 60;
    if (h > 0) {
      return m > 0 ? `${h}\u5C0F\u65F6${m}\u5206` : `${h}\u5C0F\u65F6`;
    }
    if (r === 0) return `${m}\u5206`;
    return `${m}\u5206${String(r).padStart(2, "0")}\u79D2`;
  }
  function injectStyle() {
    if (document.getElementById(STYLE_ID) !== null) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CHIP_CSS;
    document.head.appendChild(style);
  }
  function replaceTurnStatus(flow, originals, statusText) {
    const statuses = flow.matches('[role="status"]') ? [flow, ...flow.querySelectorAll('[role="status"]')] : [...flow.querySelectorAll('[role="status"]')];
    for (const status of statuses) {
      for (const node of status.childNodes) {
        if (!(node instanceof Text)) continue;
        let record = originals.get(node);
        if (record !== void 0 && node.data === record.written) {
          const next = record.original.replace(TURN_STATUS_COPY_RE, statusText);
          if (node.data !== next) {
            node.data = next;
            record.written = next;
          }
          continue;
        }
        if (TURN_STATUS_COPY_RE.test(node.data)) {
          if (record === void 0) {
            record = { original: node.data, written: "" };
            originals.set(node, record);
          }
          if (node.data !== record.written) record.original = node.data;
          const next = node.data.replace(TURN_STATUS_COPY_RE, statusText);
          if (node.data !== next) {
            node.data = next;
            record.written = next;
          }
        }
      }
    }
  }
  function restoreTurnStatus(originals) {
    for (const [node, record] of originals) {
      if (node.isConnected && node.data === record.written && node.data !== record.original) node.data = record.original;
    }
    originals.clear();
  }
  function removeStyle() {
    document.getElementById(STYLE_ID)?.remove();
  }

  // src/settings.ts
  var AUTO_COLLAPSE_NS = "dsh-auto-collapse";
  var DEFAULT_STATUS_TEXT2 = "Deep sleeping...";
  function statusTextProvider(scope) {
    return () => {
      if (scope === void 0) return DEFAULT_STATUS_TEXT2;
      const snapshot = scope.getSnapshot();
      const value = snapshot.value;
      return value?.statusText ?? DEFAULT_STATUS_TEXT2;
    };
  }
  var CARD_CSS = `
.dshcf-settings-card {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  border-radius: 12px;
  list-style: none;
  transition: border-color .16s, background .16s;
}
.dshcf-settings-card:hover { border-color: var(--dsw-alias-label-dimmed); }
.dshcf-settings-cardOpen {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-label-dimmed);
}
.dshcf-settings-header {
  appearance: none;
  width: 100%;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: 0 0;
  border: 0;
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  display: flex;
}
.dshcf-settings-header:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.dshcf-settings-headText { flex-direction: column; flex: 1; gap: 4px; min-width: 0; display: flex; }
.dshcf-settings-name { color: var(--dsw-alias-label-primary); font-size: 15px; font-weight: 600; line-height: 1.4; }
.dshcf-settings-description { color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 1.5; }
.dshcf-settings-chevron { color: var(--dsw-alias-label-tertiary); flex: none; transition: transform .16s; }
.dshcf-settings-chevronOpen { transform: rotate(180deg); }
.dshcf-settings-pending {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  flex: none;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dshcf-settings-body { border-top: 1px solid var(--dsw-alias-border-l2); margin: 0 16px; padding-bottom: 8px; }
.dshcf-settings-readOnly { color: var(--dsw-alias-label-tertiary); margin: 12px 0 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-field { flex-direction: column; gap: 6px; padding: 12px 0; display: flex; }
.dshcf-settings-fieldHead { align-items: center; gap: 8px; display: flex; }
.dshcf-settings-fieldLabel { min-width: 0; color: var(--dsw-alias-label-primary); flex: 1; font-size: 13px; font-weight: 500; line-height: 1.5; }
.dshcf-settings-badges { align-items: center; gap: 8px; display: inline-flex; }
.dshcf-settings-badge {
  white-space: nowrap;
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  line-height: 17px;
}
.dshcf-settings-reset { font: inherit; color: var(--dsw-alias-label-secondary); cursor: pointer; background: 0 0; border: none; padding: 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-reset:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.dshcf-settings-reset:disabled { cursor: default; }
.dshcf-settings-input {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  height: 34px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
  width: 100%;
}
.dshcf-settings-input:focus-visible { border-color: var(--dsw-alias-brand-primary); outline: none; }
.dshcf-settings-input:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.dshcf-settings-hint { color: var(--dsw-alias-label-tertiary); margin: 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-footer { border-top: 1px solid var(--dsw-alias-border-l2); justify-content: flex-end; align-items: center; gap: 8px; padding: 12px 0 4px; display: flex; }
.dshcf-settings-failed { min-width: 0; color: var(--dsw-alias-label-error); flex: 1; margin: 0; font-size: 12px; line-height: 1.5; }
.dshcf-settings-discard,
.dshcf-settings-save { appearance: none; font: inherit; cursor: pointer; border: 1px solid #0000; border-radius: 8px; padding: 5px 14px; font-size: 13px; line-height: 1.5; }
.dshcf-settings-discard { border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-secondary); background: 0 0; }
.dshcf-settings-discard:hover:not(:disabled) { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-label-dimmed); }
.dshcf-settings-save { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-layer-3); }
.dshcf-settings-discard:disabled,
.dshcf-settings-save:disabled { opacity: .4; cursor: default; }
.dshcf-settings-discard:focus-visible,
.dshcf-settings-save:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
`;
  var STYLE_ID2 = "dshcf-settings-style";
  var styleOwners = 0;
  function injectCardStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID2) !== null) return;
    const style = document.createElement("style");
    style.id = STYLE_ID2;
    style.textContent = CARD_CSS;
    document.head.appendChild(style);
  }
  function acquireCardStyle() {
    styleOwners += 1;
    injectCardStyle();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      styleOwners = Math.max(0, styleOwners - 1);
      if (styleOwners === 0 && typeof document !== "undefined") document.getElementById(STYLE_ID2)?.remove();
    };
  }
  function ChevronIcon(open) {
    const React = __require("react");
    const className = open ? "dshcf-settings-chevron dshcf-settings-chevronOpen" : "dshcf-settings-chevron";
    return React.createElement(
      "svg",
      { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true, className },
      React.createElement("path", {
        d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
        fill: "currentColor"
      })
    );
  }
  function StatusTextCard(props) {
    const React = __require("react");
    const scope = props.scope;
    const [open, setOpen] = React.useState(false);
    const [snapshot, setSnapshot] = React.useState(scope.getSnapshot());
    const [pending, setPending] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => scope.subscribe(() => setSnapshot(scope.getSnapshot())), [scope]);
    if (snapshot.status !== "ready") return null;
    const value = snapshot.value;
    const base = snapshot.base;
    const user = snapshot.user;
    const currentText = value?.statusText ?? "";
    const defaultText = base?.statusText ?? DEFAULT_STATUS_TEXT2;
    const text = pending ? pending.text : currentText;
    const userHas = user !== void 0 && Object.prototype.hasOwnProperty.call(user, "statusText");
    const overridden = pending ? !pending.reset : userHas;
    const dirty = pending !== null && (pending.reset ? userHas : pending.text.trim() !== currentText);
    const writable = snapshot.writable;
    const discard = () => {
      setPending(null);
      setFailed(false);
    };
    const resetField = () => {
      setPending({ text: defaultText, reset: true });
      setFailed(false);
    };
    const edit = (next) => {
      setPending({ text: next, reset: false });
      setFailed(false);
    };
    const save = async () => {
      if (pending === null) return;
      setSaving(true);
      setFailed(false);
      try {
        if (pending.reset) await scope.unset("statusText");
        else await scope.set("statusText", pending.text.trim());
        setPending(null);
      } catch {
        setFailed(true);
      } finally {
        setSaving(false);
      }
    };
    const blocked = !dirty || saving;
    const cardClass = `dshcf-settings-card${open ? " dshcf-settings-cardOpen" : ""}`;
    return React.createElement("li", { className: cardClass }, [
      React.createElement(
        "button",
        {
          type: "button",
          className: "dshcf-settings-header",
          "aria-expanded": open,
          "aria-label": `${open ? "\u6536\u8D77\u8BBE\u7F6E" : "\u5C55\u5F00\u8BBE\u7F6E"}: \u72B6\u6001\u63D0\u793A\u8BCD`,
          onClick: () => setOpen(!open)
        },
        [
          React.createElement("span", { className: "dshcf-settings-headText" }, [
            React.createElement("span", { className: "dshcf-settings-name" }, "\u72B6\u6001\u63D0\u793A\u8BCD"),
            React.createElement("span", { className: "dshcf-settings-description" }, "\u81EA\u5B9A\u4E49\u72B6\u6001\u63D0\u793A\u8BCD\uFF0C\u53EF\u4EE5\u66FF\u6362\u539F\u6709\u7684\u8FD0\u884C\u72B6\u6001\u6587\u6848\uFF08\u6DF1\u5EA6\u6C42\u7D22\u4E2D...\uFF09\uFF0C\u7531\u63D2\u4EF6dsh-auto-collapse\u63D0\u4F9B")
          ]),
          dirty ? React.createElement("span", { className: "dshcf-settings-pending" }, "\u672A\u4FDD\u5B58") : null,
          ChevronIcon(open)
        ]
      ),
      open ? React.createElement("div", { className: "dshcf-settings-body" }, [
        !writable ? React.createElement("p", { className: "dshcf-settings-readOnly", role: "status" }, "\u672C\u90E8\u7F72\u7684\u8BBE\u7F6E\u4E3A\u53EA\u8BFB\u3002") : null,
        React.createElement("div", { className: "dshcf-settings-field" }, [
          React.createElement("div", { className: "dshcf-settings-fieldHead" }, [
            React.createElement("label", { className: "dshcf-settings-fieldLabel", htmlFor: "dshcf-status-text" }, "\u81EA\u5B9A\u4E49\u72B6\u6001\u63D0\u793A\u8BCD"),
            overridden ? React.createElement("span", { className: "dshcf-settings-badges" }, [
              React.createElement("span", { className: "dshcf-settings-badge" }, "\u5DF2\u8986\u76D6"),
              React.createElement("button", { type: "button", className: "dshcf-settings-reset", disabled: !writable, onClick: resetField }, "\u6062\u590D\u9ED8\u8BA4")
            ]) : null
          ]),
          React.createElement("input", {
            id: "dshcf-status-text",
            className: "dshcf-settings-input",
            type: "text",
            value: text,
            placeholder: "\u6DF1\u5EA6\u6C42\u7D22\u4E2D...",
            disabled: !writable,
            onChange: (event) => edit(event.target.value)
          }),
          React.createElement("p", { className: "dshcf-settings-hint" }, "\u4E3A\u7A7A\u65F6\u6062\u590D\u5B98\u65B9\u9ED8\u8BA4\u6587\u6848\uFF08\u6DF1\u5EA6\u6C42\u7D22\u4E2D...\uFF09")
        ]),
        React.createElement("div", { className: "dshcf-settings-footer" }, [
          failed ? React.createElement("p", { className: "dshcf-settings-failed", role: "status" }, "\u672C\u90E8\u7F72\u6CA1\u6709\u63A5\u53D7\u8FD9\u4E9B\u503C\uFF0C\u5DF2\u4FDD\u7559\u4F9B\u4F60\u4FEE\u6539\u3002") : null,
          React.createElement("button", { type: "button", className: "dshcf-settings-discard", disabled: !dirty || saving, onClick: discard }, "\u653E\u5F03\u4FEE\u6539"),
          React.createElement("button", { type: "button", className: "dshcf-settings-save", disabled: blocked, onClick: save }, saving ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
        ])
      ]) : null
    ]);
  }
  function setupSettingsCard(ctx, scope) {
    const releaseStyle = acquireCardStyle();
    try {
      const offSlot = ctx.slots.inject("settings.plugin.item", () => ctx.slots.register(
        {
          name: "settings.plugin.item",
          key: AUTO_COLLAPSE_NS,
          inject: () => ({ scope })
        },
        StatusTextCard
      ));
      return () => {
        try {
          offSlot();
        } finally {
          releaseStyle();
        }
      };
    } catch (error) {
      releaseStyle();
      throw error;
    }
  }

  // src/client.ts
  var name = "dsh-auto-collapse";
  var inject = [];
  function apply(ctx) {
    const fallbackStatusText = () => DEFAULT_STATUS_TEXT2;
    let readStatusText = fallbackStatusText;
    const controller = new FoldController(() => readStatusText());
    ctx.effect(() => {
      controller.start();
      return () => controller.stop();
    }, "dsh-auto-collapse: fold observer");
    ctx.inject?.(["settingsScope", "slots"], (serviceCtx) => {
      serviceCtx.effect(() => {
        const settingsScope = serviceCtx.get?.("settingsScope");
        const slots = serviceCtx.get?.("slots");
        if (settingsScope === void 0 || slots === void 0) return;
        const scope = settingsScope.bind({ namespace: AUTO_COLLAPSE_NS });
        const scopedStatusText = statusTextProvider(scope);
        const offScope = scope.subscribe(() => controller.refresh());
        let offSettings;
        try {
          offSettings = setupSettingsCard({ slots }, scope);
        } catch (error) {
          offScope();
          throw error;
        }
        readStatusText = scopedStatusText;
        controller.refresh();
        return () => {
          offScope();
          offSettings();
          if (readStatusText === scopedStatusText) {
            readStatusText = fallbackStatusText;
            controller.refresh();
          }
        };
      }, "dsh-auto-collapse: settings scope + plugin card");
    });
  }
  return __toCommonJS(client_exports);
})();
return __dshcfBundle;}});

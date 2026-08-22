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
  var ANIM_DURATION_MS = 180;
  var ANIM_EASING = "ease-out";
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
  /* \u5C55\u5F00\u6001\u8865\u7684 margin-bottom 16px \u7531 aria-expanded/has-body \u7FFB\u8F6C\u9A71\u52A8\uFF1B
     \u4E8C\u7EA7\u6536\u8D77\u65F6\u82E5\u77AC\u53D8\u5F52\u96F6\uFF0Cchip \u4E0E\u9996\u4E2A\u4E09\u7EA7\u884C\u4E4B\u95F4\u4F1A\u7A81\u7136\u7F29\u77ED\uFF08\u5B9E\u6D4B\u5BBF\u4E3B
     \u9AD8\u5EA6 64\u219248 \u77AC\u8DF3\uFF09\u3002\u52A0\u8FC7\u6E21\u4E0E ANIM_DURATION_MS \u5BF9\u9F50\uFF0C\u6536/\u5C55\u53CC\u5411\u5E73\u6ED1\u3002
     \u5B9E\u8DF5\u4E2D\u8BE5\u7FFB\u8F6C\u53EA\u7531\u7528\u6237\u70B9\u51FB\uFF08\u542B data-selected \u5F3A\u5236\u5C55\u5F00\uFF09\u89E6\u53D1\uFF0C
     \u6D41\u5F0F\u534F\u8C03\u5668\u4E0D\u6539\u53D8\u5B83\uFF0C\u65E0\u9700\u989D\u5916\u95E8\u63A7\u3002 */
  transition: margin-bottom 180ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .dshcf-chip { transition: none; }
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
    constructor(statusTextProvider2) {
      this.observer = null;
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
      /** 插件改写 display 前的精确原值；受控集合用于分类漂移和 stop() 恢复。 */
      this.originalDisplay = /* @__PURE__ */ new WeakMap();
      this.controlledDisplay = /* @__PURE__ */ new Set();
      /** 被改写为状态提示词的原生状态文本，卸载时按节点恢复。 */
      this.turnStatusTexts = /* @__PURE__ */ new Map();
      /** 正文判定缓存（消息元素 → 有无正文）：流式期间只有被 mutation 命中的
       * 消息失效重算，历史消息跨 pass 复用，避免每帧全量 TreeWalker。 */
      this.bodyTextCache = /* @__PURE__ */ new WeakMap();
      /** 自上次 pass 以来子树发生变化的 flow 顶层消息；pass 开头统一失效。 */
      this.dirtyMessages = /* @__PURE__ */ new Set();
      /** 在途显示动画（元素 → 记录）：冲突仲裁、记账对齐与生命周期清理的依据。
       * 用 Map 不用 WeakMap——switchFlow/stop 需要遍历全量 cancel。 */
      this.pendingAnims = /* @__PURE__ */ new Map();
      /** 手势点击记入的一次性可动画 key；pass 消费后清除（触发门控）。 */
      this.animatableKeys = /* @__PURE__ */ new Set();
      this.statusTextProvider = statusTextProvider2 ?? (() => DEFAULT_STATUS_TEXT);
    }
    /** 设置变更后重跑一轮，让状态提示词立即生效。 */
    refresh() {
      this.schedule();
    }
    start() {
      if (this.disposed) return;
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
          attributeFilter: ["data-selected", "data-state"],
          // 流式文本更新（React 改 text node 的 data）属于 characterData
          // mutation：不观察则二级摘要/滚动跟随只能靠偶发结构变化驱动，
          // 变成“隔几秒跳一次”。所有文本写入都有守卫（值不变不写），
          // 不会自激。
          characterData: true
        });
        this.schedule();
      } catch (error) {
        this.reportError(error);
        throw error;
      }
    }
    stop() {
      this.disposed = true;
      if (this.raf !== 0) cancelAnimationFrame(this.raf);
      if (this.timer !== 0) clearTimeout(this.timer);
      this.observer?.disconnect();
      this.switchFlow(null);
      removeStyle();
    }
    /** body 级 observer 只负责发现 flow 替换；已有 flow 外的文本变化不再触发全量扫描。 */
    shouldSchedule(records) {
      if (records.length === 0 || this.flow === null || !this.flow.isConnected) return true;
      return records.some((record) => nodeWithin(record.target, this.flow) || nodeWithin(this.flow, record.target));
    }
    /** 记录本批 mutation 命中的 flow 顶层消息，供正文判定缓存定向失效。
     * 从 record.target 沿 parentNode 走到 flow 的直接子级即所属消息；
     * 归属不到单一顶层消息（flow 直挂层结构变化、flow 外节点、文本直接
     * 子节点）时全量失效——保守正确且罕见。 */
    markDirty(records) {
      const flow = this.flow;
      if (flow === null || !flow.isConnected) return;
      if (records.length === 0) {
        this.bodyTextCache = /* @__PURE__ */ new WeakMap();
        this.dirtyMessages.clear();
        return;
      }
      for (const record of records) {
        let current = record.target;
        while (current !== null && current.parentNode !== flow) current = current.parentNode;
        if (!(current instanceof HTMLElement)) {
          this.bodyTextCache = /* @__PURE__ */ new WeakMap();
          this.dirtyMessages.clear();
          return;
        }
        this.dirtyMessages.add(current);
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
      for (const el of this.dirtyMessages) this.bodyTextCache.delete(el);
      this.dirtyMessages.clear();
      const blocks = findBlocks(flow, (el) => this.hasBodyCached(el));
      this.currentBlocks = new Map(blocks.map((block) => [block.key, block]));
      const segments = buildSegments(flow, blocks, (el) => this.hasBodyCached(el));
      const liveSegmentKeys = new Set(segments.map((segment) => segment.key));
      for (const segment of segments) {
        if (segment.running && !this.runningSince.has(segment.key)) {
          this.runningSince.set(segment.key, Date.now());
        }
      }
      const completedKeys = /* @__PURE__ */ new Set();
      for (const snapshot of segments) {
        if (!snapshot.closed || snapshot.running || !snapshot.hasWork) continue;
        completedKeys.add(snapshot.key);
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
        else if (started !== void 0) state.duration = Date.now() - started;
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
      this.restoreUnusedDisplays(desiredHidden);
      for (const state of this.segmentStates.values()) this.placeProcessedRow(flow, state);
      for (const key of [...this.runningSince.keys()]) {
        if (!liveSegmentKeys.has(key)) this.runningSince.delete(key);
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
      for (const record of this.chips.values()) record.chip.remove();
      this.chips.clear();
      for (const host of [...this.mergedThinks.keys()]) this.removeMergedThink(host);
      for (const state of this.segmentStates.values()) state.row?.remove();
      this.segmentStates.clear();
      this.currentBlocks.clear();
      this.blockExpanded.clear();
      this.runningSince.clear();
      this.bodyTextCache = /* @__PURE__ */ new WeakMap();
      this.dirtyMessages.clear();
      this.restoreAllDisplays();
      restoreTurnStatus(this.turnStatusTexts);
      this.flow = next;
    }
    createProcessedRow(state) {
      const row = createProcessedRowElement(state.duration);
      row.addEventListener("click", () => {
        state.expanded = !state.expanded;
        this.animatableKeys.add(state.key);
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
      if (target === null || target.parentElement !== flow) return;
      while (target.previousElementSibling?.classList.contains("dshcf-flow-chip") === true) {
        target = target.previousElementSibling;
      }
      if (row.parentElement !== flow || row.nextElementSibling !== target) target.before(row);
    }
    reconcileBlock(block, segment, desiredHidden) {
      const state = segment === null ? void 0 : this.segmentStates.get(segment.key);
      const animate = this.animatableKeys.has(block.key) || segment !== null && this.animatableKeys.has(segment.key);
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
          if (block.mount === "before" || keepHost) {
            if (animate && this.canAnimate(existing)) this.startFadeCollapse(existing);
            else existing.style.display = "none";
          } else if (!hostFade) {
            existing.style.display = "none";
          }
        }
        this.releaseMergedThink(block.host, animate);
        return;
      }
      const chip = this.ensureChip(block);
      const hostWasHidden = block.host.style.display === "none";
      const hostAnimate = hostWasHidden && animate;
      this.restoreElement(block.host, hostAnimate);
      const chipWasHidden = chip.style.display === "none";
      if (chip.style.display !== "") chip.style.display = "";
      if (chipWasHidden && animate && !(hostAnimate && block.mount === "inside")) this.revealVisual(chip);
      let expanded = this.blockExpanded.get(block.key) ?? false;
      if (!expanded && block.rows.some((row) => row.hasAttribute("data-selected"))) {
        expanded = true;
        this.blockExpanded.set(block.key, true);
      }
      for (const container of block.containers) {
        if (expanded) this.restoreElement(container, animate);
        else this.hideElement(container, desiredHidden, animate);
      }
      for (const row of block.rows) {
        if (expanded) this.restoreElement(row, animate);
        else this.hideElement(row, desiredHidden, animate);
      }
      if (expanded && block.rows.length > 1 && block.rows.every((row) => isThinkRow(row))) {
        this.syncMergedThink(block.host, block.rows, desiredHidden, animate);
      } else {
        this.releaseMergedThink(block.host, animate);
      }
      chip.classList.toggle("dshcf-has-body", block.mount === "inside" && this.hasBodyCached(block.host));
      updateChip(chip, block.rows, expanded);
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
        leading.appendChild(createTerminalIcon());
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
      const fallbackIcon = chip.querySelector("[data-dshcf-fallback-icon]");
      if (fallbackIcon !== null) {
        const native = findNativeCommandSvg();
        if (native !== null) {
          cachedNativeCommandSvg ?? (cachedNativeCommandSvg = native);
          const replacement = native.cloneNode(true);
          const kindAttr = fallbackIcon.getAttribute("data-dshcf-icon");
          if (kindAttr !== null) replacement.setAttribute("data-dshcf-icon", kindAttr);
          fallbackIcon.replaceWith(replacement);
        }
      }
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
      if (existing !== void 0 && existing.style.display !== "none") existing.style.display = "none";
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
          const next = !this.mergedExpanded.has(host);
          if (next) this.mergedExpanded.add(host);
          else this.mergedExpanded.delete(host);
          btn.setAttribute("aria-expanded", String(next));
          if (next) this.expandMergedBody(host, btn);
          else this.collapseMergedBody(host);
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
     * 程序化 click 不触发 React 展开，且后台 tab 的 rAF 不执行）。 */
    expandMergedBody(host, btn) {
      const cached = this.mergedBodyTexts.get(host);
      if (cached !== void 0) {
        const result2 = this.ensureMergedBody(host, btn, true);
        if (result2?.created === true) this.revealMergedBody(result2.body);
        return;
      }
      const parts = this.currentThinkRows(host).map((r) => r.textContent.replace(/^Think\s*/, "").trim()).filter(Boolean);
      if (parts.length === 0) return;
      this.mergedBodyTexts.set(host, parts.join("\n\n"));
      const result = this.ensureMergedBody(host, btn, true);
      if (result?.created === true) this.revealMergedBody(result.body);
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
    /** merged-body 展开高度动画（机制样板：插件全资 DOM）。
     * 关键帧含 marginBottom 0→16px——其 CSS 有常量 margin-bottom:16px，
     * 高度从 0 起步时这 16px 会先占位产生小跳变。fill:'forwards' 托住终态，
     * onfinish 清内联后 cancel 释放，无闪烁窗口。收起保持同步 remove()。 */
    /** 清理合并 think 行（v12）：状态 map 立即清除；DOM 在手势动画路径下
     * 渐隐后移除（settle 回调），其余路径瞬删。渐隐中途被反向取消时元素
     * 保留，由后续 pass 的 syncMergedThink 重建/复用。 */
    releaseMergedThink(host, animate = false) {
      const row = this.mergedThinks.get(host);
      this.mergedExpanded.delete(host);
      this.mergedBodyTexts.delete(host);
      if (row === void 0) return;
      this.mergedThinks.delete(host);
      const body = row.nextElementSibling;
      const targets = body !== null && body.classList.contains("dshcf-merged-body") ? [row, body] : [row];
      if (animate && this.canAnimate(row)) {
        for (const t of targets) this.startFadeCollapse(t, () => t.remove());
      } else {
        for (const t of targets) t.remove();
      }
    }
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
    /** 收起合并行：移除内容块（原生行保持隐藏）。 */
    collapseMergedBody(host) {
      const btn = this.mergedThinks.get(host);
      if (btn !== void 0) {
        const body = btn.nextElementSibling;
        if (body !== null && body.classList.contains("dshcf-merged-body")) body.remove();
      }
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
    /** 返回 true 表示启动了渐隐动画（调用方可据此决定内部元素的处置）。 */
    hideElement(el, desired, animate = false) {
      desired.add(el);
      const pending = this.pendingAnims.get(el);
      if (pending !== void 0) {
        if (pending.target === "hidden") return false;
        this.cancelPendingSync(el);
      }
      if (!this.originalDisplay.has(el) && !isDisplayed(el)) return false;
      if (this.hasAnimatingAncestor(el)) return false;
      if (!this.originalDisplay.has(el)) this.originalDisplay.set(el, el.style.display);
      this.controlledDisplay.add(el);
      if (el.style.display === "none") return false;
      if (animate && this.canAnimate(el)) {
        this.startFadeCollapse(el);
        return true;
      }
      el.style.display = "none";
      return false;
    }
    restoreElement(el, animate = false) {
      const pending = this.pendingAnims.get(el);
      if (pending !== void 0) {
        if (pending.target === "visible") return;
        this.cancelPendingSync(el);
      }
      if (!this.originalDisplay.has(el)) return;
      const original = this.originalDisplay.get(el);
      if (!animate || !this.canAnimate(el) || this.hasAnimatingAncestor(el)) {
        if (el.style.display !== original) el.style.display = original;
        this.originalDisplay.delete(el);
        this.controlledDisplay.delete(el);
        return;
      }
      if (el.style.display !== original) el.style.display = original;
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
        this.originalDisplay.delete(el);
        this.controlledDisplay.delete(el);
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
      const record = { anim, target: "hidden", kind: "fade" };
      this.pendingAnims.set(el, record);
      anim.onfinish = () => {
        if (this.pendingAnims.get(el) !== record) return;
        this.pendingAnims.delete(el);
        if (el.style.display !== "none") el.style.display = "none";
        settle?.();
        anim.cancel();
        this.schedule();
      };
      anim.oncancel = () => {
        if (this.pendingAnims.get(el) !== record) return;
        this.pendingAnims.delete(el);
      };
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
        if (!desired.has(el)) this.restoreElement(el);
      }
    }
    restoreAllDisplays() {
      for (const el of [...this.controlledDisplay]) this.restoreElement(el);
      this.controlledDisplay.clear();
      this.originalDisplay = /* @__PURE__ */ new WeakMap();
    }
  };
  function createSpan(cls) {
    const span = document.createElement("span");
    span.className = cls;
    return span;
  }
  function createTerminalIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 12 10");
    svg.setAttribute("width", "12");
    svg.setAttribute("height", "10");
    svg.setAttribute("data-dshcf-fallback-icon", "");
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0.5");
    rect.setAttribute("y", "0.5");
    rect.setAttribute("width", "11");
    rect.setAttribute("height", "9");
    rect.setAttribute("rx", "1.5");
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "currentColor");
    const prompt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    prompt.setAttribute("x", "2");
    prompt.setAttribute("y", "7.5");
    prompt.setAttribute("font-size", "7");
    prompt.setAttribute("fill", "currentColor");
    prompt.textContent = ">_";
    svg.append(rect, prompt);
    return svg;
  }
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
    return createTerminalIcon();
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
  function syncLeadingIcon(chip, kind) {
    const leading = chip.querySelector(".dshcf-leading");
    if (leading === null) return;
    const existing = leading.querySelector("svg");
    if (existing !== null && existing.getAttribute("data-dshcf-icon") === kind) return;
    for (const child of [...leading.childNodes]) child.remove();
    const svg = kind === "think" ? createThinkIcon() : kind === "context" ? createContextIcon() : createCommandIcon();
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
  function flowItems(flow) {
    return [...flow.children].filter((el) => el instanceof HTMLElement && !el.classList.contains("dshcf-processed") && !el.classList.contains("dshcf-flow-chip"));
  }
  function isDisplayed(el) {
    if (typeof getComputedStyle === "function") return getComputedStyle(el).display !== "none";
    return el.style.display !== "none";
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
    const segments = [];
    let current = [];
    for (let i = 0; i < rows.length; i++) {
      current.push(rows[i]);
      if (i + 1 < rows.length && hasBodyBetween(el, rows[i], rows[i + 1])) {
        segments.push(current);
        current = [];
      }
    }
    if (current.length > 0) segments.push(current);
    return segments.length > 0 ? segments : [rows];
  }
  function hasBodyBetween(el, a, b) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) !== null) {
      if (node.data.trim() === "") continue;
      const parent = node.parentElement;
      if (parent !== null && parent.closest('[data-variant="think"], [data-chat-call-id], .dshcf-chip, .dshcf-merged-think, .dshcf-merged-body') !== null) continue;
      const posA = a.compareDocumentPosition(node);
      const posB = b.compareDocumentPosition(node);
      if ((posA & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 && (posB & Node.DOCUMENT_POSITION_PRECEDING) !== 0) {
        return true;
      }
    }
    return false;
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
      count: rows.length,
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
    const kind = running !== null ? running.kind : info.allContext ? "context" : info.tools.length > 0 ? "tool" : "think";
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
  function parseTurnDuration(boundary) {
    const text = boundary.textContent ?? "";
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
        if (node instanceof Text && node.data.includes("Deep diving")) {
          if (!originals.has(node)) originals.set(node, node.data);
          const next = node.data.replace(/Deep diving[.…]*/, statusText);
          if (node.data !== next) node.data = next;
        }
      }
    }
  }
  function restoreTurnStatus(originals) {
    for (const [node, original] of originals) {
      if (node.isConnected && node.data !== original) node.data = original;
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
  function injectCardStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID2) !== null) return;
    const style = document.createElement("style");
    style.id = STYLE_ID2;
    style.textContent = CARD_CSS;
    document.head.appendChild(style);
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
            React.createElement("span", { className: "dshcf-settings-description" }, "\u81EA\u5B9A\u4E49\u72B6\u6001\u63D0\u793A\u8BCD\uFF0C\u53EF\u4EE5\u66FF\u6362\u539F\u6709\u7684Deep diving...\u4E00\u884C\uFF0C\u7531\u63D2\u4EF6dsh-auto-collapse\u63D0\u4F9B")
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
            placeholder: "Deep diving...",
            disabled: !writable,
            onChange: (event) => edit(event.target.value)
          }),
          React.createElement("p", { className: "dshcf-settings-hint" }, "\u4E3A\u7A7A\u65F6\u6062\u590D\u9ED8\u8BA4Deep diving...\u63D0\u793A\u8BCD\u72B6\u6001")
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
    injectCardStyle();
    return ctx.slots.inject("settings.plugin.item", () => ctx.slots.register(
      {
        name: "settings.plugin.item",
        key: AUTO_COLLAPSE_NS,
        inject: () => ({ scope })
      },
      StatusTextCard
    ));
  }

  // src/client.ts
  var name = "dsh-auto-collapse";
  var inject = ["slots", "settingsScope"];
  function apply(ctx) {
    ctx.effect(() => {
      const scope = ctx.settingsScope?.bind({ namespace: AUTO_COLLAPSE_NS });
      const controller = new FoldController(statusTextProvider(scope));
      controller.start();
      const offScope = scope?.subscribe(() => controller.refresh());
      const offSettings = ctx.slots === void 0 || scope === void 0 ? void 0 : setupSettingsCard(ctx, scope);
      return () => {
        offScope?.();
        offSettings?.();
        controller.stop();
      };
    }, "dsh-auto-collapse: fold observer + settings card");
  }
  return __toCommonJS(client_exports);
})();
return __dshcfBundle;}});

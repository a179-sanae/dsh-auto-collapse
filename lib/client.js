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

  // src/host-contract.ts
  var FLOW = "[data-chat-flow]";
  var SEAT = "[data-chat-flow-kind]";
  var OWNED = "[data-dshcf-group]";
  var FOLDED = "data-dshcf-folded";
  var NATIVE_HIDDEN = "[data-turn-process-hidden], [data-turn-process-inline]";
  function elementOf(node) {
    return node.nodeType === 1 ? node : node.parentElement;
  }
  function pluginOwned(node) {
    return elementOf(node)?.closest(OWNED) != null;
  }
  function seatOf(node, flow) {
    let element = elementOf(node);
    while (element !== null && element.parentElement !== flow) element = element.parentElement;
    return element instanceof HTMLElement && element.matches(SEAT) ? element : null;
  }
  function seatKey(seat) {
    return seat.getAttribute("data-chat-flow-key") ?? seat.getAttribute("data-chat-anchor-key");
  }
  function nativeHidden(row, flow) {
    const owner = row.closest(NATIVE_HIDDEN);
    return owner !== null && flow.contains(owner);
  }
  function nativeOwnsHidden(element) {
    return element.matches(NATIVE_HIDDEN);
  }
  function findFlow() {
    for (const flow of document.querySelectorAll(FLOW)) {
      if (flow.getClientRects().length > 0 && getComputedStyle(flow).visibility !== "hidden") return flow;
    }
    return null;
  }
  function nativeControls(flow) {
    const result = /* @__PURE__ */ new Map();
    for (const button of flow.querySelectorAll("button[data-turn-process]")) {
      const turn = button.getAttribute("data-turn-process");
      if (turn !== null && button.closest('[data-chat-flow-kind="turn-process"]') !== null) result.set(turn, button);
    }
    return result;
  }
  function nativeCollapsed(button) {
    if (button === void 0 || !button.isConnected) return false;
    const expanded = button.getAttribute("aria-expanded");
    return expanded === "false" || expanded === null && !button.hasAttribute("data-open");
  }
  function openNative(button) {
    if (button !== void 0 && nativeCollapsed(button)) {
      const focused = button.ownerDocument.activeElement;
      button.click();
      if (focused instanceof HTMLElement && focused.isConnected && focused !== button) {
        focused.focus({ preventScroll: true });
        if (focused === button.ownerDocument.body && button.ownerDocument.activeElement === button) button.blur();
      }
    }
  }
  var OBSERVED_ATTRIBUTES = [
    "data-chat-flow-key",
    "data-chat-anchor-key",
    "data-chat-flow-kind",
    "data-chat-turn",
    "data-variant",
    "data-tool",
    "data-state",
    "data-selected",
    "data-open",
    "data-expanded",
    "aria-expanded",
    "data-turn-process-member",
    "data-turn-process-hidden",
    "data-turn-process-inline",
    "hidden",
    "style",
    "class"
  ];

  // src/work-model.ts
  var ASSISTANT_KINDS = /* @__PURE__ */ new Set(["assistant-step", "assistant"]);
  var CONTEXT_KINDS = /* @__PURE__ */ new Set(["context", "system-prompt"]);
  var COMMAND_KINDS = /* @__PURE__ */ new Set(["command", "manual-compaction"]);
  function readSeat(seat, fallback) {
    const kind = seat.getAttribute("data-chat-flow-kind");
    const key = seatKey(seat);
    const turn = seat.getAttribute("data-chat-turn") || null;
    const result = { tokens: [], items: [] };
    if (kind === "turn-process") return result;
    if (key === null || kind === null) {
      result.tokens.push({ type: "boundary", id: `unknown:${key ?? fallback}`, turn: null, hard: true });
      return result;
    }
    const boundary = (id, hard) => ({ type: "boundary", id: `${key}:${id}`, turn, hard });
    const add = (row, workKind, suffix) => {
      const item = {
        id: JSON.stringify([key, workKind, suffix]),
        turn,
        kind: workKind,
        seat,
        row,
        cover: row,
        followNativeTurn: kind === "system-prompt" && turn !== null
      };
      result.items.push(item);
      return item;
    };
    const token = (item) => ({ type: "work", id: item.id, turn, kind: item.kind });
    if (CONTEXT_KINDS.has(kind) || COMMAND_KINDS.has(kind)) {
      if (seat.childNodes.length === 0) return result;
      const item = add(seat, CONTEXT_KINDS.has(kind) ? "context" : "command", "");
      result.tokens.push(token(item));
      return result;
    }
    if (!ASSISTANT_KINDS.has(kind) && kind !== "tool-call") {
      result.tokens.push(boundary("fence", true));
      return result;
    }
    const roots = /* @__PURE__ */ new Map();
    const paths = /* @__PURE__ */ new Set([seat]);
    const candidates = [...seat.querySelectorAll('[data-chat-call-id], [data-variant="think"]')];
    let thinkIndex = 0;
    for (const row of candidates) {
      if (pluginOwned(row) || row.closest("[data-subcalls]") !== null) continue;
      const outerCall = row.parentElement?.closest("[data-chat-call-id]");
      if (outerCall !== null && outerCall !== void 0 && seat.contains(outerCall)) continue;
      const isTool = row.hasAttribute("data-chat-call-id");
      if (!isTool && row.hasAttribute("data-tool")) continue;
      if (row.querySelector("[data-disclosure-row]") === null) continue;
      const item = add(row, isTool ? "tool" : "think", isTool ? row.getAttribute("data-chat-call-id") : String(thinkIndex++));
      roots.set(row, item);
      for (let parent = row.parentElement; parent !== null && seat.contains(parent); parent = parent.parentElement) paths.add(parent);
    }
    let bodyIndex = 0;
    const visit = (node) => {
      if (pluginOwned(node) || node.nodeType === 8) return [];
      if (node.nodeType === 3) return (node.textContent ?? "").trim() === "" ? [] : [boundary(`body:${bodyIndex++}`, false)];
      if (!(node instanceof Element)) return [];
      if (node.matches("script, style, template")) return [];
      const work = roots.get(node);
      if (work !== void 0) return [token(work)];
      if (!paths.has(node)) {
        return [boundary(`body:${bodyIndex++}`, false)];
      }
      const children = [...node.childNodes].flatMap(visit);
      if (children.length > 0 && children.every((child) => child.type === "work") && node instanceof HTMLElement) {
        const ids = new Set(children.map((child) => child.id));
        for (const item of result.items) if (ids.has(item.id)) item.cover = node;
      }
      return children;
    };
    result.tokens = visit(seat);
    return result;
  }
  var WorkModel = class {
    constructor() {
      this.seats = /* @__PURE__ */ new Map();
      this.identities = /* @__PURE__ */ new WeakMap();
      this.sequence = 0;
    }
    read(flow, dirty, force = false) {
      const live = /* @__PURE__ */ new Set();
      const tokens = [];
      const items = /* @__PURE__ */ new Map();
      for (const child of flow.children) {
        if (!(child instanceof HTMLElement) || pluginOwned(child)) continue;
        if (!child.hasAttribute("data-chat-flow-kind")) {
          continue;
        }
        live.add(child);
        let snapshot = this.seats.get(child);
        if (force || snapshot === void 0 || dirty.has(child)) {
          let identity = this.identities.get(child);
          if (identity === void 0) {
            identity = String(++this.sequence);
            this.identities.set(child, identity);
          }
          snapshot = readSeat(child, identity);
          this.seats.set(child, snapshot);
        }
        tokens.push(...snapshot.tokens);
        for (const item of snapshot.items) items.set(item.id, item);
      }
      for (const seat of this.seats.keys()) if (!live.has(seat)) this.seats.delete(seat);
      return { tokens, items };
    }
    clear() {
      this.seats.clear();
    }
  };

  // src/work-groups.ts
  function resolveTurns(tokens) {
    const nextTurns = new Array(tokens.length).fill(null);
    let next = null;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const token = tokens[i];
      if (token.type === "boundary" && token.hard) next = null;
      nextTurns[i] = next;
      if (!(token.type === "boundary" && token.hard) && token.turn !== null) next = token.turn;
    }
    let previous = null;
    return tokens.map((token, i) => {
      if (token.type === "boundary" && token.hard) {
        previous = null;
        return token;
      }
      if (token.turn !== null) {
        previous = token.turn;
        return token;
      }
      if (token.type !== "work") return token;
      const following = nextTurns[i];
      const turn = previous === null ? following : following === null || previous === following ? previous : null;
      return { ...token, turn };
    });
  }
  function groupWork(tokens) {
    const groups = [];
    let left = "start";
    let current = null;
    let lastItem = "";
    for (const token of resolveTurns(tokens)) {
      if (token.type === "boundary") {
        left = token.id;
        current = null;
        continue;
      }
      if (current !== null && current.turn !== token.turn) {
        left = `turn-after:${lastItem}`;
        current = null;
      }
      if (current === null) {
        current = { id: JSON.stringify([left, token.turn]), turn: token.turn, items: [] };
        groups.push(current);
      }
      current.items.push(token.id);
      lastItem = token.id;
    }
    return groups;
  }
  var GroupState = class {
    constructor() {
      this.groups = /* @__PURE__ */ new Map();
      this.expanded = /* @__PURE__ */ new Map();
    }
    reconcile(groups) {
      const previousItems = /* @__PURE__ */ new Map();
      for (const group of this.groups.values()) {
        for (const id of group.items) previousItems.set(id, this.isExpanded(group.id));
      }
      const next = /* @__PURE__ */ new Map();
      for (const group of groups) {
        next.set(group.id, this.expanded.get(group.id) ?? group.items.some((id) => previousItems.get(id) === true));
      }
      this.groups = new Map(groups.map((group) => [group.id, group]));
      this.expanded = next;
    }
    isExpanded(id) {
      return this.expanded.get(id) ?? false;
    }
    setExpanded(id, value) {
      if (this.groups.has(id)) this.expanded.set(id, value);
    }
    clear() {
      this.groups.clear();
      this.expanded.clear();
    }
  };

  // src/summary.ts
  function toolAction(tool) {
    if (/^(write|edit|str_replace|apply_patch)/.test(tool)) return "\u7F16\u8F91\u4E86\u6587\u4EF6";
    if (/^(read|glob|grep|list_directory|file_search)/.test(tool)) return "\u8BFB\u53D6\u4E86\u6587\u4EF6";
    if (/^(web_search|search)/.test(tool)) return "\u641C\u7D22\u4E86\u8D44\u6599";
    if (/(browser|browse|playwright|chrome|web_fetch)/.test(tool)) return "\u4F7F\u7528\u4E86\u6D4F\u89C8\u5668";
    if (/^(bash|pwsh|shell|run_code|exec|cordis_run)/.test(tool)) return "\u8FD0\u884C\u4E86\u547D\u4EE4";
    return tool === "" ? "\u8C03\u7528\u4E86\u5DE5\u5177" : `\u8C03\u7528\u4E86 ${tool}`;
  }
  function normalizeStatus(value) {
    if (value === "running") return "running";
    if (value === "error" || value === "failed") return "error";
    if (value === "stopped" || value === "interrupted" || value === "cancelled") return "stopped";
    if (value === "waiting" || value === "pending" || value === "approval") return "waiting";
    return "done";
  }
  function summarize(infos) {
    const last = infos[infos.length - 1];
    const running = [...infos].reverse().find((info) => info.status === "running" || info.status === "waiting");
    const current = running ?? last;
    const actions = [...new Set(infos.map((info) => info.action))];
    const status = running?.status ?? (infos.some((info) => info.status === "error") ? "error" : infos.some((info) => info.status === "stopped") ? "stopped" : "done");
    let text = actions.join(" \xB7 ");
    let detail = "";
    if (running !== void 0) {
      const active = running.status === "waiting" ? "\u7B49\u5F85\u64CD\u4F5C" : running.kind === "think" ? "\u6B63\u5728\u601D\u8003" : running.kind === "context" ? "\u6B63\u5728\u6CE8\u5165\u4E0A\u4E0B\u6587" : "\u6B63\u5728\u8FD0\u884C";
      text = [...actions.filter((action) => action !== running.action), active].join(" \xB7 ");
      detail = running.detail;
    } else if (status === "error") text += " \xB7 \u51FA\u9519";
    else if (status === "stopped") text += " \xB7 \u5DF2\u505C\u6B62";
    return { text: text || "\u5DE5\u4F5C\u8FC7\u7A0B", detail, status, kind: current?.kind ?? "tool" };
  }

  // src/work-info.ts
  function preview(row) {
    const follow = row.querySelector("[data-follow-end]");
    if (follow !== null) return (follow.textContent ?? "").trim().slice(-240);
    const disclosure = row.querySelector("[data-disclosure-row]");
    if (disclosure === null) return "";
    for (const child of [...disclosure.children].slice(2)) {
      if (child.getAttribute("aria-hidden") === "true") continue;
      const value = (child.textContent ?? "").trim();
      if (value !== "") return value.replace(/\s+/g, " ").slice(0, 240);
    }
    return "";
  }
  function readWorkInfo(item) {
    const root = item.kind === "tool" ? item.row.querySelector("[data-tool]") ?? item.row : item.kind === "command" ? item.row.querySelector("[data-state]") ?? item.row : item.row;
    const action = item.kind === "think" ? "\u5DF2\u601D\u8003" : item.kind === "context" ? "\u5DF2\u6CE8\u5165\u4E0A\u4E0B\u6587" : item.kind === "command" ? "\u8FD0\u884C\u4E86\u547D\u4EE4" : toolAction((root.getAttribute("data-tool") ?? "").slice(0, 80));
    return { kind: item.kind, action, detail: preview(item.row), status: normalizeStatus(root.getAttribute("data-state")) };
  }
  function needsAttention(items, infos) {
    return items.some(
      (item) => item.cover.contains(document.activeElement) || item.row.hasAttribute("data-selected") || item.row.querySelector("[data-selected], input:not(:disabled), textarea:not(:disabled), select:not(:disabled)") !== null || infos.get(item.id)?.status === "waiting"
    );
  }

  // src/styles.css
  var styles_default = '/* Keep native content searchable while removing folded work from flex/grid spacing. */\n[data-dshcf-folded][hidden="until-found"] {\n  position: absolute !important;\n  content-visibility: hidden !important;\n  inline-size: 0 !important;\n  block-size: 0 !important;\n  min-inline-size: 0 !important;\n  min-block-size: 0 !important;\n  margin: 0 !important;\n  padding: 0 !important;\n  border-width: 0 !important;\n  overflow: clip !important;\n}\n.dshcf-group {\n  appearance: none;\n  display: flex;\n  align-items: center;\n  align-self: flex-start;\n  gap: 6px;\n  box-sizing: border-box;\n  max-width: 100%;\n  min-width: 0;\n  min-height: 24px;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary, #919191);\n  font: 400 var(--dsh-content-font-size, 14px)/24px system-ui, sans-serif;\n  text-align: left;\n  cursor: pointer;\n}\n.dshcf-group[hidden] { display: none; }\n.dshcf-group:hover { color: var(--dsw-alias-label-primary, #d5d5d5); }\n.dshcf-group:focus-visible { outline: 2px solid var(--dsw-alias-state-focus-ring, #4d6bfe); outline-offset: 3px; border-radius: 3px; }\n.dshcf-group-icon { display: flex; flex: none; width: 16px; height: 16px; align-items: center; justify-content: center; }\n.dshcf-group-icon svg { display: block; width: 14px; height: 14px; }\n.dshcf-group-label { flex: 0 0 auto; min-width: 0; max-width: calc(100% - 40px); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }\n.dshcf-group[data-status="running"] .dshcf-group-label,\n.dshcf-group[data-status="waiting"] .dshcf-group-label { max-width: 65%; }\n.dshcf-group-detail { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--dsw-alias-label-secondary, #aaa); }\n.dshcf-group-detail:empty { display: none; }\n.dshcf-group-chevron { flex: none; width: 12px; height: 12px; opacity: .65; transform: rotate(-90deg); }\n.dshcf-group[aria-expanded="true"] .dshcf-group-chevron { transform: none; }\n.dshcf-group[data-status="running"] .dshcf-group-label { animation: dshcf-pulse 1.6s ease-in-out infinite; }\n.dshcf-group[data-status="error"] { color: var(--dsw-alias-state-error-primary, #e5484d); }\n.dshcf-group[data-status="stopped"], .dshcf-group[data-status="waiting"] { color: var(--dsw-alias-state-warning-primary, #c58a2c); }\n@keyframes dshcf-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }\n@media (prefers-reduced-motion: reduce) { .dshcf-group[data-status="running"] .dshcf-group-label { animation: none; } }\n';

  // src/dom-view.ts
  var GroupView = class {
    constructor(flow, toggle) {
      this.flow = flow;
      this.toggle = toggle;
      this.owner = `v2-${Math.random().toString(36).slice(2)}`;
      this.rows = /* @__PURE__ */ new Map();
      this.leases = /* @__PURE__ */ new Map();
      this.writes = /* @__PURE__ */ new Map();
      this.displays = /* @__PURE__ */ new Map();
      this.style = document.createElement("style");
      this.style.id = "dshcf-v2-style";
      this.style.textContent = styles_default;
      document.head.append(this.style);
    }
    writeHidden(element, value) {
      if (element.getAttribute("hidden") === value) return;
      this.writes.set(element, value);
      if (value === null) element.removeAttribute("hidden");
      else element.setAttribute("hidden", value);
    }
    ownMutation(record) {
      return record.type === "attributes" && record.attributeName === "hidden" && record.target instanceof HTMLElement && this.writes.has(record.target) && this.writes.get(record.target) === record.target.getAttribute("hidden");
    }
    clearWrites() {
      this.writes.clear();
    }
    detachedGroups(nodes) {
      return nodes.flatMap((node) => {
        if (!(node instanceof HTMLElement) || node.isConnected) return [];
        const id = node.getAttribute("data-dshcf-group");
        return id !== null && this.rows.get(id)?.button === node ? [id] : [];
      });
    }
    beginRead() {
      this.displays.clear();
    }
    fold(element, group) {
      if (nativeOwnsHidden(element)) {
        this.release(element);
        return;
      }
      const existing = this.leases.get(element);
      if (existing === void 0) {
        if (element.hasAttribute("hidden")) return;
        this.leases.set(element, { hidden: null, marker: element.getAttribute(FOLDED), group });
        element.setAttribute(FOLDED, this.owner);
      } else if (element.getAttribute(FOLDED) !== this.owner) {
        this.leases.delete(element);
        return;
      }
      this.writeHidden(element, "until-found");
    }
    release(element) {
      const lease = this.leases.get(element);
      if (lease === void 0) return;
      this.leases.delete(element);
      if (element.getAttribute(FOLDED) !== this.owner) return;
      if (!nativeOwnsHidden(element) && element.getAttribute("hidden") === "until-found") this.writeHidden(element, lease.hidden);
      if (lease.marker === null) element.removeAttribute(FOLDED);
      else element.setAttribute(FOLDED, lease.marker);
    }
    externallyHidden(item) {
      for (let element = item.row; element !== null && element !== this.flow; element = element.parentElement) {
        let display = this.displays.get(element);
        if (display === void 0) {
          display = getComputedStyle(element).display;
          this.displays.set(element, display);
        }
        if (display === "none") return true;
        if (element.hasAttribute("hidden") && !this.leases.has(element)) return true;
      }
      return false;
    }
    create(id) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dshcf-group";
      button.setAttribute("data-dshcf-group", id);
      const icon = document.createElement("span");
      icon.className = "dshcf-group-icon";
      icon.setAttribute("aria-hidden", "true");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("fill", "none");
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", "M3 3.5h10M3 8h10M3 12.5h10M1 3.5h.1M1 8h.1M1 12.5h.1");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.3");
      path.setAttribute("stroke-linecap", "round");
      svg.append(path);
      icon.append(svg);
      const label = document.createElement("span");
      label.className = "dshcf-group-label";
      const detail = document.createElement("span");
      detail.className = "dshcf-group-detail";
      const chevron = document.createElementNS(svg.namespaceURI, "svg");
      chevron.setAttribute("class", "dshcf-group-chevron");
      chevron.setAttribute("viewBox", "0 0 12 12");
      chevron.setAttribute("aria-hidden", "true");
      const arrow = document.createElementNS(svg.namespaceURI, "path");
      arrow.setAttribute("d", "m3 4.5 3 3 3-3");
      arrow.setAttribute("fill", "none");
      arrow.setAttribute("stroke", "currentColor");
      chevron.append(arrow);
      button.append(icon, label, detail, chevron);
      button.addEventListener("click", () => {
        if (this.rows.get(id)?.button === button) this.toggle(id);
      });
      const row = { button, label, detail, targets: /* @__PURE__ */ new Set() };
      this.rows.set(id, row);
      return row;
    }
    summarize(id, summary, expanded) {
      const row = this.rows.get(id);
      if (row === void 0) return;
      if (row.label.textContent !== summary.text) row.label.textContent = summary.text;
      const detail = expanded ? "" : summary.detail;
      if (row.detail.textContent !== detail) row.detail.textContent = detail;
      const attributes = {
        "aria-expanded": String(expanded),
        "aria-label": `${expanded ? "\u6536\u8D77" : "\u5C55\u5F00"}\u5DE5\u4F5C\u8FC7\u7A0B\uFF1A${summary.text}${detail ? ` \xB7 ${detail}` : ""}`,
        "data-status": summary.status,
        title: `${summary.text}${detail ? ` \xB7 ${detail}` : ""}`
      };
      for (const [name2, value] of Object.entries(attributes)) if (row.button.getAttribute(name2) !== value) row.button.setAttribute(name2, value);
    }
    prepare(id, items, expanded, summary, turnCollapsed) {
      const available = items.filter((item) => item.row.isConnected && !nativeHidden(item.row, this.flow) && !this.externallyHidden(item));
      const hiddenByTurn = (item) => turnCollapsed && item.followNativeTurn;
      const anchor = available.find((item) => !hiddenByTurn(item))?.cover;
      const desired = new Set(available.filter((item) => !expanded || hiddenByTurn(item)).map((item) => item.cover));
      return { id, expanded, summary, anchor, desired };
    }
    apply({ id, expanded, summary, anchor, desired }) {
      const row = this.rows.get(id) ?? this.create(id);
      row.button.hidden = anchor === void 0;
      if (anchor !== void 0 && (row.button.parentNode !== anchor.parentNode || row.button.nextSibling !== anchor)) {
        const focused = document.activeElement === row.button;
        anchor.before(row.button);
        if (focused) row.button.focus({ preventScroll: true });
      }
      for (const target of row.targets) if (!desired.has(target)) this.release(target);
      for (const target of desired) this.fold(target, id);
      row.targets = desired;
      this.summarize(id, summary, expanded);
    }
    focus(id) {
      this.rows.get(id)?.button.focus({ preventScroll: true });
    }
    remove(id) {
      const row = this.rows.get(id);
      if (row === void 0) return;
      for (const target of row.targets) this.release(target);
      row.button.remove();
      this.rows.delete(id);
    }
    dispose() {
      for (const id of [...this.rows.keys()]) this.remove(id);
      for (const target of [...this.leases.keys()]) this.release(target);
      this.style.remove();
      this.writes.clear();
      this.displays.clear();
    }
  };

  // src/scheduler.ts
  var Scheduler = class {
    constructor(run) {
      this.run = run;
      this.frame = 0;
      this.timeout = 0;
      this.disposed = false;
    }
    schedule() {
      if (this.disposed || this.frame !== 0 || this.timeout !== 0) return;
      const flush = () => {
        if (this.frame !== 0) cancelAnimationFrame(this.frame);
        if (this.timeout !== 0) clearTimeout(this.timeout);
        this.frame = this.timeout = 0;
        if (!this.disposed) this.run();
      };
      this.frame = requestAnimationFrame(flush);
      this.timeout = window.setTimeout(flush, 60);
    }
    dispose() {
      this.disposed = true;
      if (this.frame !== 0) cancelAnimationFrame(this.frame);
      if (this.timeout !== 0) clearTimeout(this.timeout);
      this.frame = this.timeout = 0;
    }
  };

  // src/status-text.ts
  var COPY = /Deep diving[.…]*|深度求索中\s*[.…]*/;
  var StatusTextController = class {
    constructor(read) {
      this.read = read;
      this.flow = null;
      this.observer = null;
      this.texts = /* @__PURE__ */ new Map();
      this.scheduler = new Scheduler(() => this.update());
    }
    setFlow(flow) {
      if (flow === this.flow) return;
      this.observer?.disconnect();
      this.restore();
      this.flow = flow;
      if (flow === null) return;
      this.observer = new MutationObserver((records) => {
        if (records.some((record) => {
          const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
          const status = element?.closest('[role="status"]');
          if (status?.closest("[data-chat-flow-kind]") != null) return false;
          if (record.type === "characterData" && record.target instanceof Text) {
            return status != null && this.texts.get(record.target)?.written !== record.target.data;
          }
          return record.type === "childList" && (status != null || [...record.addedNodes].some((node) => node instanceof Element && (node.matches('[role="status"]') || node.querySelector('[role="status"]') !== null)));
        })) this.refresh();
      });
      this.observer.observe(flow, { subtree: true, childList: true, characterData: true });
      this.refresh();
    }
    refresh() {
      this.scheduler.schedule();
    }
    update() {
      if (this.flow === null) return;
      const replacement = this.read();
      if (replacement === "" || replacement === void 0) {
        this.restore();
        return;
      }
      for (const text of this.texts.keys()) if (!text.isConnected) this.texts.delete(text);
      for (const status of this.flow.querySelectorAll('[role="status"]')) {
        if (status.closest("[data-chat-flow-kind]") !== null) continue;
        const walker = document.createTreeWalker(status, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode()) !== null) {
          const text = node;
          const previous = this.texts.get(text);
          const original = previous?.written === text.data ? previous.original : text.data;
          if (!COPY.test(original)) continue;
          const written = original.replace(COPY, () => replacement);
          this.texts.set(text, { original, written });
          if (text.data !== written) text.data = written;
        }
      }
    }
    restore() {
      for (const [text, record] of this.texts) if (text.data === record.written) text.data = record.original;
      this.texts.clear();
    }
    dispose() {
      this.observer?.disconnect();
      this.scheduler.dispose();
      this.restore();
      this.flow = null;
    }
  };

  // src/controller.ts
  var STRUCTURAL_ATTRIBUTES = /* @__PURE__ */ new Set(["data-chat-flow-key", "data-chat-anchor-key", "data-chat-flow-kind", "data-chat-turn", "data-variant", "data-tool"]);
  var FoldController = class {
    constructor(statusText) {
      this.flow = null;
      this.observer = null;
      this.view = null;
      this.model = new WorkModel();
      this.state = new GroupState();
      this.scheduler = new Scheduler(() => this.flush());
      this.items = /* @__PURE__ */ new Map();
      this.groups = /* @__PURE__ */ new Map();
      this.infos = /* @__PURE__ */ new Map();
      this.itemGroups = /* @__PURE__ */ new Map();
      this.rowItems = /* @__PURE__ */ new WeakMap();
      this.seatGroups = /* @__PURE__ */ new Map();
      this.turnGroups = /* @__PURE__ */ new Map();
      this.controls = /* @__PURE__ */ new Map();
      this.dirtySeats = /* @__PURE__ */ new Set();
      this.dirtyItems = /* @__PURE__ */ new Set();
      this.dirtyGroups = /* @__PURE__ */ new Set();
      this.modelDirty = true;
      this.discover = true;
      this.force = true;
      this.started = false;
      this.disposed = false;
      this.lastError = "";
      this.stats = { passes: 0, structures: 0, groupUpdates: 0, infoUpdates: 0, lastDurationMs: 0 };
      this.ready = () => this.start();
      this.visible = () => {
        if (!document.hidden) {
          this.discover = true;
          this.refresh();
        }
      };
      this.reveal = (event) => this.revealAt(event.target, event.type === "beforematch");
      this.status = statusText === void 0 ? null : new StatusTextController(statusText);
    }
    start() {
      if (this.started || this.disposed || typeof document === "undefined") return;
      if (document.body === null) {
        document.addEventListener("DOMContentLoaded", this.ready, { once: true });
        return;
      }
      const owner = document;
      if (owner.__dshAutoCollapseV2 !== this) owner.__dshAutoCollapseV2?.stop();
      owner.__dshAutoCollapseV2 = this;
      document.removeEventListener("DOMContentLoaded", this.ready);
      this.started = true;
      this.observer = new MutationObserver((records) => this.mutations(records));
      this.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: OBSERVED_ATTRIBUTES });
      document.addEventListener("visibilitychange", this.visible);
      this.scheduler.schedule();
    }
    refresh() {
      if (this.disposed) return;
      this.force = this.modelDirty = true;
      this.status?.refresh();
      this.scheduler.schedule();
    }
    refreshStatus() {
      if (!this.disposed) this.status?.refresh();
    }
    /** Small diagnostics for regressions/performance, never rendered into the chat. */
    diagnostics() {
      return { ...this.stats, groups: this.groups.size, items: this.items.size };
    }
    itemAt(node) {
      for (let element = elementOf(node); element !== null && element !== this.flow; element = element.parentElement) {
        const id = this.rowItems.get(element);
        if (id !== void 0) return id;
      }
      return void 0;
    }
    dirtySeatGroups(seat) {
      if (seat === null) return;
      for (const id of this.seatGroups.get(seat) ?? []) this.dirtyGroups.add(id);
      if (seat.getAttribute("data-chat-flow-kind") === "turn-process") {
        const turn = seat.getAttribute("data-chat-turn");
        if (turn !== null) for (const id of this.turnGroups.get(turn) ?? []) this.dirtyGroups.add(id);
      }
    }
    mutations(records) {
      if (this.disposed) return;
      let relevant = false;
      for (const record of records) {
        if (pluginOwned(record.target) || this.view?.ownMutation(record)) continue;
        const changed = [...record.addedNodes, ...record.removedNodes];
        for (const id of this.view?.detachedGroups(changed) ?? []) {
          this.dirtyGroups.add(id);
          relevant = true;
        }
        if (record.type === "childList" && changed.length > 0 && changed.every(pluginOwned)) continue;
        const flow = this.flow;
        if (flow === null || !flow.isConnected) {
          this.discover = relevant = true;
          continue;
        }
        if (!flow.contains(record.target)) {
          if (record.type === "attributes" && record.target instanceof Element && record.target.contains(flow)) {
            this.discover = this.force = this.modelDirty = relevant = true;
          }
          if (record.type === "childList" && changed.some((node) => node instanceof Element && (node.matches("[data-chat-flow]") || node.querySelector("[data-chat-flow]") !== null))) this.discover = relevant = true;
          continue;
        }
        const seat = seatOf(record.target, flow);
        if (seat === null && record.target !== flow) continue;
        relevant = true;
        const item = this.itemAt(record.target);
        if (record.type === "attributes" && STRUCTURAL_ATTRIBUTES.has(record.attributeName ?? "")) {
          this.modelDirty = true;
          if (seat !== null) this.dirtySeats.add(seat);
        } else if (item !== void 0) {
          this.dirtyItems.add(item);
          if (record.type === "attributes") this.dirtySeatGroups(seat);
        } else if (record.type === "attributes") {
          this.dirtySeatGroups(seat);
          if (seat === null) {
            this.force = this.modelDirty = true;
            this.discover = true;
          }
        } else {
          this.modelDirty = true;
          if (seat !== null) this.dirtySeats.add(seat);
          this.dirtySeatGroups(seat);
        }
      }
      this.view?.clearWrites();
      if (relevant) this.scheduler.schedule();
    }
    switchFlow(flow) {
      if (flow === this.flow) return;
      this.flow?.removeEventListener("beforematch", this.reveal, true);
      this.flow?.removeEventListener("focusin", this.reveal, true);
      this.view?.dispose();
      this.view = null;
      this.model.clear();
      this.state.clear();
      this.items.clear();
      this.groups.clear();
      this.infos.clear();
      this.itemGroups.clear();
      this.seatGroups.clear();
      this.turnGroups.clear();
      this.controls.clear();
      this.rowItems = /* @__PURE__ */ new WeakMap();
      this.dirtySeats.clear();
      this.dirtyItems.clear();
      this.dirtyGroups.clear();
      this.flow = flow;
      this.force = this.modelDirty = true;
      this.status?.setFlow(flow);
      if (flow !== null) {
        this.view = new GroupView(flow, (id) => this.toggle(id));
        flow.addEventListener("beforematch", this.reveal, true);
        flow.addEventListener("focusin", this.reveal, true);
      }
    }
    rebuild(flow) {
      const previousItems = this.items;
      const previousGroups = this.groups;
      const previousControls = this.controls;
      const snapshot = this.model.read(flow, this.dirtySeats, this.force);
      const groups = groupWork(snapshot.tokens);
      this.state.reconcile(groups);
      this.items = snapshot.items;
      this.groups = new Map(groups.map((group) => [group.id, group]));
      this.itemGroups.clear();
      this.seatGroups.clear();
      this.turnGroups.clear();
      this.rowItems = /* @__PURE__ */ new WeakMap();
      this.controls = nativeControls(flow);
      for (const id of previousGroups.keys()) if (!this.groups.has(id)) this.view?.remove(id);
      for (const id of this.infos.keys()) if (!this.items.has(id)) this.infos.delete(id);
      for (const group of groups) {
        const previous = previousGroups.get(group.id);
        if (this.force || previous === void 0 || previous.items.length !== group.items.length || previous.items.some((id, i) => id !== group.items[i])) this.dirtyGroups.add(group.id);
        if (group.turn !== null) {
          if (previousControls.get(group.turn) !== this.controls.get(group.turn)) this.dirtyGroups.add(group.id);
          const siblings = this.turnGroups.get(group.turn) ?? /* @__PURE__ */ new Set();
          siblings.add(group.id);
          this.turnGroups.set(group.turn, siblings);
        }
        for (const id of group.items) {
          const item = this.items.get(id);
          const previousItem = previousItems.get(id);
          if (previousItem !== item) {
            this.dirtyItems.add(id);
            this.dirtyGroups.add(group.id);
          }
          this.itemGroups.set(id, group.id);
          this.rowItems.set(item.row, id);
          const owners = this.seatGroups.get(item.seat) ?? /* @__PURE__ */ new Set();
          owners.add(group.id);
          this.seatGroups.set(item.seat, owners);
        }
      }
      this.dirtySeats.clear();
      this.force = this.modelDirty = false;
      this.stats.structures++;
    }
    prepare(group) {
      const items = group.items.map((id) => this.items.get(id)).filter(Boolean);
      if (!this.state.isExpanded(group.id) && needsAttention(items, this.infos)) {
        this.state.setExpanded(group.id, true);
        if (group.turn !== null) openNative(this.controls.get(group.turn));
      }
      this.stats.groupUpdates++;
      const turnCollapsed = group.turn !== null && nativeCollapsed(this.controls.get(group.turn));
      return this.view?.prepare(group.id, items, this.state.isExpanded(group.id), summarize(group.items.map((id) => this.infos.get(id)).filter(Boolean)), turnCollapsed);
    }
    flush() {
      if (this.disposed) return;
      const start = performance.now();
      this.stats.passes++;
      try {
        if (this.discover || !this.flow?.isConnected) {
          this.discover = false;
          this.switchFlow(findFlow());
        }
        const flow = this.flow;
        if (flow === null) return;
        if (this.modelDirty) this.rebuild(flow);
        this.view?.beginRead();
        const summaries = /* @__PURE__ */ new Set();
        for (const id of this.dirtyItems) {
          const item = this.items.get(id);
          if (item === void 0) continue;
          this.infos.set(id, readWorkInfo(item));
          this.stats.infoUpdates++;
          const group = this.itemGroups.get(id);
          if (group !== void 0) summaries.add(group);
        }
        const prepared = [];
        for (const id of this.dirtyGroups) {
          const group = this.groups.get(id);
          if (group !== void 0) {
            const update = this.prepare(group);
            if (update !== void 0) prepared.push(update);
          }
          summaries.delete(id);
        }
        for (const update of prepared) this.view?.apply(update);
        for (const id of summaries) {
          const group = this.groups.get(id);
          if (group !== void 0) this.view?.summarize(id, summarize(group.items.map((item) => this.infos.get(item)).filter(Boolean)), this.state.isExpanded(id));
        }
        this.lastError = "";
      } catch (error) {
        this.observer?.disconnect();
        this.switchFlow(null);
        if (!this.disposed && document.body !== null) this.observer?.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: OBSERVED_ATTRIBUTES });
        const message = String(error);
        if (this.lastError !== message) console.error("[dsh-auto-collapse] restored native view after an error", error);
        this.lastError = message;
      } finally {
        this.dirtyGroups.clear();
        this.dirtyItems.clear();
        this.stats.lastDurationMs = performance.now() - start;
      }
    }
    toggle(id) {
      const group = this.groups.get(id);
      if (group === void 0 || this.disposed) return;
      const expanded = !this.state.isExpanded(id);
      this.state.setExpanded(id, expanded);
      if (expanded && group.turn !== null) {
        openNative(this.controls.get(group.turn));
        this.view?.focus(id);
      }
      this.dirtyGroups.add(id);
      this.scheduler.schedule();
    }
    revealAt(node, search) {
      if (this.flow === null || pluginOwned(node)) return;
      const item = this.itemAt(node);
      const groups = item !== void 0 ? [this.itemGroups.get(item)] : [...this.seatGroups.get(seatOf(node, this.flow)) ?? []];
      for (const id of groups) {
        const group = this.groups.get(id);
        if (group === void 0) continue;
        if (!search && this.state.isExpanded(id)) continue;
        this.state.setExpanded(id, true);
        if (group.turn !== null) openNative(this.controls.get(group.turn));
        this.dirtyGroups.add(id);
      }
      if (groups.length > 0) this.scheduler.schedule();
    }
    stop() {
      if (this.disposed) return;
      this.disposed = true;
      this.started = false;
      this.observer?.disconnect();
      this.scheduler.dispose();
      if (typeof document !== "undefined") {
        document.removeEventListener("DOMContentLoaded", this.ready);
        document.removeEventListener("visibilitychange", this.visible);
      }
      this.switchFlow(null);
      this.status?.dispose();
      if (typeof document !== "undefined") {
        const owner = document;
        if (owner.__dshAutoCollapseV2 === this) delete owner.__dshAutoCollapseV2;
      }
    }
  };

  // src/settings.ts
  var AUTO_COLLAPSE_NS = "dsh-auto-collapse";
  var DEFAULT_STATUS_TEXT = "Deep sleeping...";
  function statusTextProvider(scope) {
    return () => {
      if (scope === void 0) return DEFAULT_STATUS_TEXT;
      const snapshot = scope.getSnapshot();
      const value = snapshot.value;
      return value?.statusText ?? DEFAULT_STATUS_TEXT;
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
  var STYLE_ID = "dshcf-settings-style";
  var styleOwners = 0;
  function injectCardStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID) !== null) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
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
      if (styleOwners === 0 && typeof document !== "undefined") document.getElementById(STYLE_ID)?.remove();
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
    const snapshot = React.useSyncExternalStore(
      React.useCallback((listener) => scope.subscribe(listener), [scope]),
      React.useCallback(() => scope.getSnapshot(), [scope])
    );
    const [pending, setPending] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    if (snapshot.status !== "ready") return null;
    const value = snapshot.value;
    const base = snapshot.base;
    const user = snapshot.user;
    const currentText = value?.statusText ?? "";
    const defaultText = base?.statusText ?? DEFAULT_STATUS_TEXT;
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
      if (pending === null || saving || !writable) return;
      const submitted = pending;
      setSaving(true);
      setFailed(false);
      try {
        if (pending.reset) await scope.unset("statusText");
        else await scope.set("statusText", pending.text.trim());
        setPending((current) => current === submitted ? null : current);
      } catch {
        setFailed(true);
      } finally {
        setSaving(false);
      }
    };
    const blocked = !dirty || saving || !writable;
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
              React.createElement("button", { type: "button", className: "dshcf-settings-reset", disabled: !writable || saving, onClick: resetField }, "\u6062\u590D\u9ED8\u8BA4")
            ]) : null
          ]),
          React.createElement("input", {
            id: "dshcf-status-text",
            className: "dshcf-settings-input",
            type: "text",
            value: text,
            placeholder: "\u6DF1\u5EA6\u6C42\u7D22\u4E2D...",
            disabled: !writable || saving,
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
    const fallbackStatusText = () => DEFAULT_STATUS_TEXT;
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
        const offScope = scope.subscribe(() => controller.refreshStatus());
        let offSettings;
        try {
          offSettings = setupSettingsCard({ slots }, scope);
        } catch (error) {
          offScope();
          throw error;
        }
        readStatusText = scopedStatusText;
        controller.refreshStatus();
        return () => {
          offScope();
          offSettings();
          if (readStatusText === scopedStatusText) {
            readStatusText = fallbackStatusText;
            controller.refreshStatus();
          }
        };
      }, "dsh-auto-collapse: settings scope + plugin card");
    });
  }
  return __toCommonJS(client_exports);
})();
return __dshcfBundle;}});

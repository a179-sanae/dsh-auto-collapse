/*
Captured native widgets from @deepseek-ai/dsh 0.1.5-rc.2.
Functions below are unmodified; only their dependency/CSS bindings are supplied by this test fixture.
Chat bundle SHA-256: 6527556d25c7b2a27f2e3bfb96cc2ae3d9244f1213147e245b17684ad8d9e396
Frontend bundle SHA-256: ae6b5df63da1ac26890eeb1847272005ab3860048d8fb46de1d08732861703c3

MIT License

Copyright (c) 2026 DeepSeek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
import React from 'react'
import * as JSX from 'react/jsx-runtime'
const react = React
const react_jsx_runtime = JSX
const d = JSX
const Ce = (...classes) => classes.filter(Boolean).join(' ')
const Ut = { root: 'disclosure', row: 'native-row', iconIdle: 'native-icon', chevronHover: 'native-chevron', leading: 'native-leading', title: 'native-title' }
const Dl = props => JSX.jsx('svg', { ...props, width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true, children: JSX.jsx('path', { d: 'm4 5 3 3 3-3', fill: 'none', stroke: 'currentColor' }) })
const y3 = Dl
const ReasoningRow_module_css_default = { root: 'native-think', row: 'native-row', leading: 'native-leading', title: 'native-title', chevron: 'native-chevron', separator: 'native-separator', summary: 'native-summary', summaryText: 'native-summary-text', thinkBody: 'think-body' }
const TurnProcessNodeView_module_css_default = { root: 'native-turn', label: 'native-label', chevron: 'native-chevron' }
const ContextInjectionRow_module_css_default = { root: 'native-context', chevron: 'native-chevron', body: 'native-detail' }
const accessibility_module_css_default = { visuallyHidden: 'visually-hidden' }
const _deepseek_ai_dsh_client_ui_primitives = { DisclosureRow: Yp, IconThinkOutline14: Dl, IconChevronDownOutline14: Dl, IconBrowseOutline16: Dl }
const OpaqueBody = ({ content }) => JSX.jsx('pre', { children: content.map(block => block.text).join('') })

function Yp({icon:t,title:r,open:i,expandable:s,onToggle:a,expandOnRowClick:c=!1,previewChevron:h=s,keepContentWhenOpen:p=!1,collapsedContent:m,children:g,className:v,rowClassName:w,leadingClassName:x,chevronClassName:k,titleClassName:_}){const b=s&&c,T=F=>{F.stopPropagation(),a()},H=F=>{!b||F.key!=="Enter"&&F.key!==" "||(F.preventDefault(),a())},$=h?d.jsxs(d.Fragment,{children:[d.jsx("span",{className:Ut.iconIdle,children:t}),d.jsx(y3,{className:Ce(k,Ut.chevronHover)})]}):t,Q=i?d.jsx(y3,{className:k}):$;return d.jsxs("div",{className:Ce(Ut.root,v),"data-open":i||void 0,children:[d.jsxs("div",{className:Ce(Ut.row,w),"data-disclosure-row":!0,"data-expandable":b||void 0,role:b?"button":void 0,tabIndex:b?0:void 0,"aria-expanded":b?i:void 0,onClick:b?a:void 0,onKeyDown:b?H:void 0,children:[s&&!b?d.jsx("button",{type:"button",className:Ce(Ut.leading,x),"aria-expanded":i,onClick:T,children:Q}):d.jsx("span",{className:Ce(Ut.leading,x),children:Q}),d.jsx("span",{className:Ce(Ut.title,_),children:r}),(p||!i)&&m]}),i&&g]})}

/**
		* Apply searchable hidden state without unmounting a stable subtree.
		* @param hidden - whether the subtree is currently hidden.
		* @param reveal - callback for browser find's `beforematch` reveal.
		* @returns ref for the stable subtree root.
		*/
		function useSearchableHidden(hidden, reveal) {
			const ref = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				const element = ref.current;
				if (element === null) return;
				if (hidden && element.contains(element.ownerDocument.activeElement)) {
					reveal();
					return;
				}
				if (hidden) element.setAttribute("hidden", "until-found");
				else element.removeAttribute("hidden");
			}, [hidden, reveal]);
			(0, react.useEffect)(() => {
				const element = ref.current;
				if (element === null) return;
				element.addEventListener("beforematch", reveal);
				return () => {
					element.removeEventListener("beforematch", reveal);
				};
			}, [reveal]);
			return ref;
		}

/** Assistant reasoning disclosure, independent of Tool-call presentation. */
		function firstLine(text) {
			const newline = text.indexOf("\n");
			return newline === -1 ? text : text.slice(0, newline);
		}
		function latestLine(text) {
			const visible = text.trimEnd();
			const newline = visible.lastIndexOf("\n");
			return newline === -1 ? visible : visible.slice(newline + 1);
		}
		/**
		* Render one assistant reasoning block as the Think disclosure row. The
		* collapsed summary omits double-asterisk markers; expanded content preserves
		* the complete text.
		* @param props.text - complete or streaming reasoning text.
		* @param props.running - whether this block is the streaming tail.
		* @param props.t - conversation locale seat for the running status.
		* @returns the reasoning disclosure.
		*/
		function ReasoningRow({ text, running, t }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const summary = (running ? latestLine(text) : firstLine(text)).replaceAll("**", "");
			return (0, react_jsx_runtime.jsxs)("div", {
				className: ReasoningRow_module_css_default.root,
				"data-variant": "think",
				"data-state": running ? "running" : "ok",
				"data-expanded": expanded || void 0,
				children: [running && (0, react_jsx_runtime.jsx)("span", {
					className: accessibility_module_css_default.visuallyHidden,
					children: t("row.running")
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
					rowClassName: ReasoningRow_module_css_default.row,
					leadingClassName: ReasoningRow_module_css_default.leading,
					titleClassName: ReasoningRow_module_css_default.title,
					chevronClassName: ReasoningRow_module_css_default.chevron,
					icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutline14, { size: 14 }),
					title: t("message.think"),
					open: expanded,
					expandable: true,
					expandOnRowClick: true,
					onToggle: () => {
						setExpanded((value) => !value);
					},
					collapsedContent: (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
						className: ReasoningRow_module_css_default.separator,
						"aria-hidden": true
					}), (0, react_jsx_runtime.jsx)("span", {
						className: ReasoningRow_module_css_default.summary,
						"data-follow-end": running || void 0,
						children: (0, react_jsx_runtime.jsx)("span", {
							className: ReasoningRow_module_css_default.summaryText,
							children: summary
						})
					})] }),
					children: (0, react_jsx_runtime.jsx)("div", {
						className: ReasoningRow_module_css_default.thinkBody,
						children: text
					})
				})]
			});
		}

/** Turn-level process disclosure controller. */
		const TurnProcessNodeView = (0, react.memo)(function TurnProcessNodeView({ node, turnProcess, t }) {
			if (turnProcess === void 0) throw new Error("turn-process node requires Turn process owner state");
			if (!turnProcess.foldable) return null;
			const open = turnProcess.open;
			const labels = [];
			if (node.data.toolCallCount > 0) labels.push(t(node.data.toolCallCount === 1 ? "message.turnProcess.toolCalls.one" : "message.turnProcess.toolCalls.other", { count: node.data.toolCallCount }));
			if (node.data.messageCount > 0) labels.push(t(node.data.messageCount === 1 ? "message.turnProcess.messages.one" : "message.turnProcess.messages.other", { count: node.data.messageCount }));
			if (node.data.subagentCount > 0) labels.push(t(node.data.subagentCount === 1 ? "message.turnProcess.subagents.one" : "message.turnProcess.subagents.other", { count: node.data.subagentCount }));
			const label = labels.length === 0 ? t("message.turnProcess.thoughtForAWhile") : labels.join(t("message.turnProcess.separator"));
			return (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: TurnProcessNodeView_module_css_default.root,
				"data-open": open || void 0,
				"data-turn-process": node.data.turn,
				"data-turn-process-messages": node.data.messageCount,
				"data-turn-process-tool-calls": node.data.toolCallCount,
				"data-turn-process-subagents": node.data.subagentCount,
				"aria-expanded": open,
				onClick: (event) => {
					event.currentTarget.focus();
					turnProcess.setOpen(!open);
				},
				children: [(0, react_jsx_runtime.jsx)("span", {
					className: TurnProcessNodeView_module_css_default.label,
					children: label
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: TurnProcessNodeView_module_css_default.chevron })]
			});
		});

/**
		* Render one complete system prompt as a collapsed disclosure whose expanded
		* body is the same opaque context chrome: 141px code-block scrollport and
		* model-facing text with its real line breaks. An in-history update uses the
		* same row under its own title.
		* @param props - Complete prompt text, whether it is an update, and the locale seat.
		* @returns The system-prompt disclosure row.
		*/
		function SystemPromptRow({ text, update = false, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				className: ContextInjectionRow_module_css_default.root,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }),
				chevronClassName: ContextInjectionRow_module_css_default.chevron,
				title: t(update ? "message.systemPromptUpdate" : "message.systemPrompt"),
				open,
				expandable: true,
				expandOnRowClick: true,
				onToggle: () => {
					setOpen((value) => !value);
				},
				children: (0, react_jsx_runtime.jsx)("div", {
					className: ContextInjectionRow_module_css_default.body,
					"data-system-prompt-body": true,
					children: (0, react_jsx_runtime.jsx)(OpaqueBody, {
						content: [{
							type: "text",
							text
						}],
						source: null,
						t
					})
				})
			});
		}
		/** System-prompt keyed Chat renderer. */
		const SystemPromptNodeView = (0, react.memo)(function SystemPromptNodeView({ node, t }) {
			return (0, react_jsx_runtime.jsx)(SystemPromptRow, {
				text: node.data.text,
				update: node.data.update === true,
				t
			});
		});

export const nativeHostVersion = '0.1.5-rc.2'
export { Yp as NativeDisclosureRow, ReasoningRow as NativeReasoningRow, TurnProcessNodeView as NativeTurnProcess, SystemPromptRow as NativeSystemPrompt, useSearchableHidden }

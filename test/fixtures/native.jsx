/*
Captured native widgets from @deepseek-ai/dsh 0.1.2-rc.1.
Functions below are unmodified; only their dependency/CSS bindings are supplied by this test fixture.
Chat bundle SHA-256: 9c9874c57b7d3e5a71222a72e0f19ed8d884c40f895d898640c882d49bd1b231
Frontend bundle SHA-256: 9e845cbbe80482a49831d912b9c02324c5ff1e8c35b9cc5f7009ecbe6e4537c1

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
const Rn = { root: 'disclosure', row: 'native-row', iconIdle: 'native-icon', chevronHover: 'native-chevron', leading: 'native-leading', title: 'native-title' }
const Dl = props => JSX.jsx('svg', { ...props, width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true, children: JSX.jsx('path', { d: 'm4 5 3 3 3-3', fill: 'none', stroke: 'currentColor' }) })
const ReasoningRow_module_css_default = { root: 'native-think', row: 'native-row', leading: 'native-leading', title: 'native-title', chevron: 'native-chevron', separator: 'native-separator', summary: 'native-summary', summaryText: 'native-summary-text', thinkBody: 'think-body' }
const TurnProcessNodeView_module_css_default = { root: 'native-turn', label: 'native-label', chevron: 'native-chevron' }
const ContextInjectionRow_module_css_default = { root: 'native-context', chevron: 'native-chevron', body: 'native-detail' }
const accessibility_module_css_default = { visuallyHidden: 'visually-hidden' }
const _deepseek_ai_dsh_client_ui_primitives = { DisclosureRow: jd, IconThinkOutline14: Dl, IconChevronDownOutline14: Dl, IconBrowseOutline16: Dl }
const OpaqueBody = ({ content }) => JSX.jsx('pre', { children: content.map(block => block.text).join('') })

function jd({icon:n,title:i,open:o,expandable:l,onToggle:u,expandOnRowClick:c=!1,previewChevron:h=l,keepContentWhenOpen:m=!1,collapsedContent:C,children:g,className:w,rowClassName:_,leadingClassName:y,chevronClassName:k,titleClassName:j}){const N=l&&c,H=U=>{U.stopPropagation(),u()},z=U=>{!N||U.key!=="Enter"&&U.key!==" "||(U.preventDefault(),u())},Z=h?d.jsxs(d.Fragment,{children:[d.jsx("span",{className:Rn.iconIdle,children:n}),d.jsx(Dl,{className:Ce(k,Rn.chevronHover)})]}):n,q=o?d.jsx(Dl,{className:k}):Z;return d.jsxs("div",{className:Ce(Rn.root,w),"data-open":o||void 0,children:[d.jsxs("div",{className:Ce(Rn.row,_),"data-disclosure-row":!0,"data-expandable":N||void 0,role:N?"button":void 0,tabIndex:N?0:void 0,"aria-expanded":N?o:void 0,onClick:N?u:void 0,onKeyDown:N?z:void 0,children:[l&&!N?d.jsx("button",{type:"button",className:Ce(Rn.leading,y),"aria-expanded":o,onClick:H,children:q}):d.jsx("span",{className:Ce(Rn.leading,y),children:q}),d.jsx("span",{className:Ce(Rn.title,j),children:i}),(m||!o)&&C]}),o&&g]})}

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
		* Render one assistant reasoning block as the Think disclosure row.
		* @param props.text - complete or streaming reasoning text.
		* @param props.running - whether this block is the streaming tail.
		* @param props.t - conversation locale seat for the running status.
		* @returns the reasoning disclosure.
		*/
		function ReasoningRow({ text, running, t }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const summary = running ? latestLine(text) : firstLine(text);
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
		* model-facing text with its real line breaks.
		* @param props - Complete prompt text and the locale seat.
		* @returns The system-prompt disclosure row.
		*/
		function SystemPromptRow({ text, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				className: ContextInjectionRow_module_css_default.root,
				icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 }),
				chevronClassName: ContextInjectionRow_module_css_default.chevron,
				title: t("message.systemPrompt"),
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
				t
			});
		});

export { jd as NativeDisclosureRow, ReasoningRow as NativeReasoningRow, TurnProcessNodeView as NativeTurnProcess, SystemPromptRow as NativeSystemPrompt, useSearchableHidden }

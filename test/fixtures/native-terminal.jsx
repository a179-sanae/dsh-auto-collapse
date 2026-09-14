/*
Captured unmodified TerminalBlock and its dependency closure from DSH 0.1.5-rc.2.
Only React, class-name/CSS bindings and decorative state glyphs are supplied by the fixture.
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


ANSI parsing includes Anser. Its original MIT notice follows:
The MIT License (MIT)

Copyright (c) 2012-25 Ionică Bizău <bizauionica@gmail.com> (https://ionicabizau.net)

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
const I = React
const d = JSX
const Ce = (...classes) => classes.filter(Boolean).join(' ')
const O6 = ({ state, className }) => JSX.jsx('span', { className, 'data-state': state, 'aria-hidden': true, children: '●' })
const D6 = ({ children, className }) => JSX.jsx('span', { className, children })
const i1 = { block: 'native-terminal', header: 'native-terminal-header', prompt: 'native-terminal-prompt', runStateLabel: 'visually-hidden', promptLine: 'native-terminal-prompt-line', runState: 'native-terminal-state', cwd: 'native-terminal-cwd', command: 'native-terminal-command', status: 'native-terminal-status', copyButton: 'native-terminal-copy', empty: 'native-terminal-empty', output: 'native-terminal-output', line: 'native-terminal-line', expand: 'native-terminal-expand' }

function $r(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}

var K0;

var x5;

function cf(){if(x5)return K0;x5=1;const t=[[{color:"0, 0, 0",class:"ansi-black"},{color:"187, 0, 0",class:"ansi-red"},{color:"0, 187, 0",class:"ansi-green"},{color:"187, 187, 0",class:"ansi-yellow"},{color:"0, 0, 187",class:"ansi-blue"},{color:"187, 0, 187",class:"ansi-magenta"},{color:"0, 187, 187",class:"ansi-cyan"},{color:"255,255,255",class:"ansi-white"}],[{color:"85, 85, 85",class:"ansi-bright-black"},{color:"255, 85, 85",class:"ansi-bright-red"},{color:"0, 255, 0",class:"ansi-bright-green"},{color:"255, 255, 85",class:"ansi-bright-yellow"},{color:"85, 85, 255",class:"ansi-bright-blue"},{color:"255, 85, 255",class:"ansi-bright-magenta"},{color:"85, 255, 255",class:"ansi-bright-cyan"},{color:"255, 255, 255",class:"ansi-bright-white"}]],r=/(https?:\/\/(?:[A-Za-z0-9#;/?:@=+$',_.!~*()[\]-]|&amp;|%[A-Fa-f0-9]{2})+)/gm;class i{static escapeForHtml(a){return new i().escapeForHtml(a)}static linkify(a){return new i().linkify(a)}static ansiToHtml(a,c){return new i().ansiToHtml(a,c)}static ansiToJson(a,c){return new i().ansiToJson(a,c)}static ansiToText(a){return new i().ansiToText(a)}constructor(){this.fg=this.bg=this.fg_truecolor=this.bg_truecolor=null,this.bright=0,this.decorations=[]}setupPalette(){this.PALETTE_COLORS=[];for(let p=0;p<2;++p)for(let m=0;m<8;++m)this.PALETTE_COLORS.push(t[p][m].color);let a=[0,95,135,175,215,255],c=(p,m,g)=>a[p]+", "+a[m]+", "+a[g];for(let p=0;p<6;++p)for(let m=0;m<6;++m)for(let g=0;g<6;++g)this.PALETTE_COLORS.push(c(p,m,g));let h=8;for(let p=0;p<24;++p,h+=10)this.PALETTE_COLORS.push(h+", "+h+", "+h)}escapeForHtml(a){return a.replace(/[&<>\"]/gm,c=>c=="&"?"&amp;":c=='"'?"&quot;":c=="<"?"&lt;":c==">"?"&gt;":"")}linkify(a){return a.replace(r,c=>`<a href="${c}">${c}</a>`)}ansiToHtml(a,c){return this.process(a,c,!0)}ansiToJson(a,c){return c=c||{},c.json=!0,c.clearLine=!1,this.process(a,c,!0)}ansiToText(a){return this.process(a,{},!1)}process(a,c,h){let p=this,m=a.split(/\033\[/),g=m.shift();c==null&&(c={}),c.clearLine=/\r/.test(a);let v=m.map(w=>this.processChunk(w,c,h));if(c&&c.json){let w=p.processChunkJson("");return w.content=g,w.clearLine=c.clearLine,v.unshift(w),c.remove_empty&&(v=v.filter(x=>!x.isEmpty())),v}else v.unshift(g);return v.join("")}processChunkJson(a,c,h){c=typeof c>"u"?{}:c;let p=c.use_classes=typeof c.use_classes<"u"&&c.use_classes,m=c.key=p?"class":"color",g={content:a,fg:null,bg:null,fg_truecolor:null,bg_truecolor:null,isInverted:!1,clearLine:c.clearLine,decoration:null,decorations:[],was_processed:!1,isEmpty:()=>!g.content},v=a.match(/^([!\x3c-\x3f]*)([\d;]*)([\x20-\x2c]*[\x40-\x7e])([\s\S]*)/m);if(!v)return g;g.content=v[4];let w=v[2].split(";");if(v[1]!==""||v[3]!=="m"||!h)return g;let x=this;for(;w.length>0;){let k=w.shift(),_=parseInt(k);if(isNaN(_)||_===0)x.fg=x.bg=null,x.decorations=[];else if(_===1)x.decorations.push("bold");else if(_===2)x.decorations.push("dim");else if(_===3)x.decorations.push("italic");else if(_===4)x.decorations.push("underline");else if(_===5)x.decorations.push("blink");else if(_===7)x.decorations.push("reverse");else if(_===8)x.decorations.push("hidden");else if(_===9)x.decorations.push("strikethrough");else if(_===21)x.removeDecoration("bold");else if(_===22)x.removeDecoration("bold"),x.removeDecoration("dim");else if(_===23)x.removeDecoration("italic");else if(_===24)x.removeDecoration("underline");else if(_===25)x.removeDecoration("blink");else if(_===27)x.removeDecoration("reverse");else if(_===28)x.removeDecoration("hidden");else if(_===29)x.removeDecoration("strikethrough");else if(_===39)x.fg=null;else if(_===49)x.bg=null;else if(_>=30&&_<38)x.fg=t[0][_%10][m];else if(_>=90&&_<98)x.fg=t[1][_%10][m];else if(_>=40&&_<48)x.bg=t[0][_%10][m];else if(_>=100&&_<108)x.bg=t[1][_%10][m];else if(_===38||_===48){let b=_===38;if(w.length>=1){let T=w.shift();if(T==="5"&&w.length>=1){let H=parseInt(w.shift());if(H>=0&&H<=255)if(!p)this.PALETTE_COLORS||x.setupPalette(),b?x.fg=this.PALETTE_COLORS[H]:x.bg=this.PALETTE_COLORS[H];else{let $=H>=16?"ansi-palette-"+H:t[H>7?1:0][H%8].class;b?x.fg=$:x.bg=$}}else if(T==="2"&&w.length>=3){let H=parseInt(w.shift()),$=parseInt(w.shift()),Q=parseInt(w.shift());if(H>=0&&H<=255&&$>=0&&$<=255&&Q>=0&&Q<=255){let F=H+", "+$+", "+Q;p?b?(x.fg="ansi-truecolor",x.fg_truecolor=F):(x.bg="ansi-truecolor",x.bg_truecolor=F):b?x.fg=F:x.bg=F}}}}}return x.fg===null&&x.bg===null&&x.decorations.length===0||(g.fg=x.fg,g.bg=x.bg,g.fg_truecolor=x.fg_truecolor,g.bg_truecolor=x.bg_truecolor,g.decorations=x.decorations,g.decoration=x.decorations.slice(-1).pop()||null,g.was_processed=!0),g}processChunk(a,c,h){c=c||{};let p=this.processChunkJson(a,c,h),m=c.use_classes;if(p.decorations=p.decorations.filter(_=>{if(_==="reverse"){p.fg||(p.fg=t[0][7][m?"class":"color"]),p.bg||(p.bg=t[0][0][m?"class":"color"]);let b=p.fg;p.fg=p.bg,p.bg=b;let T=p.fg_truecolor;return p.fg_truecolor=p.bg_truecolor,p.bg_truecolor=T,p.isInverted=!0,!1}return!0}),c.json)return p;if(p.isEmpty())return"";if(!p.was_processed)return p.content;let g=[],v=[],w=[],x={},k=_=>{let b=[],T;for(T in _)_.hasOwnProperty(T)&&b.push("data-"+T+'="'+this.escapeForHtml(_[T])+'"');return b.length>0?" "+b.join(" "):""};return p.isInverted&&(x["ansi-is-inverted"]="true"),p.fg&&(m?(g.push(p.fg+"-fg"),p.fg_truecolor!==null&&(x["ansi-truecolor-fg"]=p.fg_truecolor,p.fg_truecolor=null)):g.push("color:rgb("+p.fg+")")),p.bg&&(m?(g.push(p.bg+"-bg"),p.bg_truecolor!==null&&(x["ansi-truecolor-bg"]=p.bg_truecolor,p.bg_truecolor=null)):g.push("background-color:rgb("+p.bg+")")),p.decorations.forEach(_=>{if(m){v.push("ansi-"+_);return}_==="bold"?v.push("font-weight:bold"):_==="dim"?v.push("opacity:0.5"):_==="italic"?v.push("font-style:italic"):_==="hidden"?v.push("visibility:hidden"):_==="strikethrough"?w.push("line-through"):w.push(_)}),w.length&&v.push("text-decoration:"+w.join(" ")),m?'<span class="'+g.concat(v).join(" ")+'"'+k(x)+">"+p.content+"</span>":'<span style="'+g.concat(v).join(";")+'"'+k(x)+">"+p.content+"</span>"}removeDecoration(a){const c=this.decorations.indexOf(a);c>=0&&this.decorations.splice(c,1)}}return K0=i,K0}

var uf=cf();

const df=$r(uf);

async function Rn(t){if(navigator.clipboard?.writeText)try{return await navigator.clipboard.writeText(t),!0}catch{return!1}const r=typeof document.execCommand=="function"?document.execCommand.bind(document):void 0;if(r===void 0)return!1;const i=document.createElement("textarea");i.value=t,i.setAttribute("readonly",""),i.style.position="fixed",i.style.left="-9999px",document.body.appendChild(i),i.select();try{return r("copy")}catch{return!1}finally{i.remove()}}

const im={"0,0,0":"var(--dsw-alias-label-primary)","255,255,255":"var(--dsw-alias-label-primary)","85,85,85":"var(--dsw-alias-label-tertiary)","187,0,0":"var(--dsw-alias-state-error-primary)","255,85,85":"var(--dsw-alias-state-error-secondary)","0,187,0":"var(--dsw-alias-state-success-primary)","0,255,0":"var(--dsw-alias-state-success-secondary)","187,187,0":"var(--dsw-alias-state-warn-primary)","255,255,85":"var(--dsw-alias-state-warn-secondary)","0,0,187":"var(--dsw-alias-state-business-primary)","85,85,255":"var(--dsw-static-blue-400)"};

const om={bold:{fontWeight:700},dim:{opacity:.7},italic:{fontStyle:"italic"},underline:{textDecoration:"underline"},strikethrough:{textDecoration:"line-through"},hidden:{visibility:"hidden"}};

const sm=/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)?/g;

const lm=/\u001b(?!\[)[\u0020-\u002f]*[\u0030-\u007e]?/g;

const am=/[\u0000-\u0007\u000b-\u001a\u001c-\u001f\u007f]/g;

const cm=/\r|\u0008|\u001b\[[\u0030-\u003f]*[\u0020-\u002f]*K/;

const um=/\u001b\[([\u0030-\u003f]*)[\u0020-\u002f]*m/g;

const M5=8;

const dm=/^[\p{Mn}\p{Me}\p{Cf}\u200b-\u200f\u2060]$/u;

const fm=new RegExp("\\p{Script=Han}|\\p{Script=Hiragana}|\\p{Script=Katakana}|\\p{Script=Hangul}|\\p{Emoji_Presentation}|[\\uff01-\\uff60\\u3000-\\u303e]","u");

function e3(t){const r=t.codePointAt(0);return r===void 0||r<4352?!1:fm.test(t)}

const Ir={fg:"",bg:"",attrs:[]};

const hm={22:["1","2"],23:["3"],24:["4"],25:["5","6"],27:["7"],28:["8"],29:["9"]};

function Y6(t,r){const i=r===""?["0"]:r.split(";");let s=t;for(let a=0;a<i.length;a++){const c=String(i[a]);if(c===""||c==="0"){s=Ir;continue}if(c==="38"||c==="48"){const m=i[a+1]??"",g=m==="2"?4:m==="5"?2:0,v=i.slice(a,a+g+1).join(";");s=c==="38"?{...s,fg:v}:{...s,bg:v},a+=g;continue}const h=hm[c];if(h!==void 0){s={...s,attrs:s.attrs.filter(m=>!h.includes(m))};continue}const p=Number(c);if(c==="39"){s={...s,fg:""};continue}if(c==="49"){s={...s,bg:""};continue}if(p>=30&&p<=37||p>=90&&p<=97){s={...s,fg:c};continue}if(p>=40&&p<=47||p>=100&&p<=107){s={...s,bg:c};continue}s.attrs.includes(c)||(s={...s,attrs:[...s.attrs,c]})}return s}

function I5(t){const r=[...t.attrs];return t.fg!==""&&r.push(t.fg),t.bg!==""&&r.push(t.bg),r.length===0?"":`\x1B[${r.join(";")}m`}

function io(t,r){return t.fg===r.fg&&t.bg===r.bg&&t.attrs.length===r.attrs.length&&t.attrs.every((i,s)=>i===r.attrs[s])}

function pm(t,r){const i=/\u001b\[([\u0030-\u003f]*)[\u0020-\u002f]*([\u0040-\u007e])/g,s=[];let a=0,c=r,h=0;const p=(w,x)=>{const k=s[w];k?.spacer===!0&&w>0?s[w-1]={sgr:c,char:x}:k!==void 0&&e3(k.char)&&s[w+1]?.spacer===!0&&(s[w+1]={sgr:c,char:x}),s[w]={sgr:c,char:x}},m=w=>{for(const x of w){if(x==="\r"){a=0;continue}if(x==="\b"){a=Math.max(0,a-1);continue}if(x==="	"){const k=a+M5-a%M5;for(;a<k;a++)s[a]??={sgr:c,char:" "};continue}if(dm.test(x)){const k=a>0?s[a-1]:void 0;k!==void 0&&(s[a-1]={sgr:k.sgr,char:k.char+x});continue}p(a," "),s[a]={sgr:c,char:x},a++,e3(x)&&(s[a]={sgr:c,char:"",spacer:!0},a++)}};for(const w of t.matchAll(i)){m(t.slice(h,w.index)),h=w.index+w[0].length;const x=String(w[1]),k=String(w[2]);if(k==="K"){const _=String(x.split(";")[0]);if(_==="1")for(let b=0;b<=a;b++)p(b," ");else s.length=_==="2"?0:a;continue}k==="m"&&(c=Y6(c,x))}m(t.slice(h));let g="",v=r;for(let w=0;w<s.length;w++){const x=s[w]??{sgr:Ir,char:" "};io(x.sgr,v)||(io(v,Ir)||(g+="\x1B[0m"),g+=I5(x.sgr),v=x.sgr);const k=w>0&&e3(s[w-1]?.char??"");g+=x.spacer===!0&&!k?" ":x.char}return io(v,c)||(io(v,Ir)||(g+="\x1B[0m"),g+=I5(c)),{text:g,sgr:c}}

function Cm(t){const r=[];let i=Ir;for(const s of t.split(`
`)){const a=s.replace(/\r+$/,"");if(cm.test(a)){const c=pm(a,i);r.push(c.text),i=c.sgr;continue}r.push(a);for(const c of a.matchAll(um))i=Y6(i,String(c[1]))}return r.join(`
`)}

function mm(t){return Cm(t.replace(sm,"").replace(lm,"")).replace(am,"")}

function gm(t){const r={},i=t.bg===null?void 0:`rgb(${t.bg})`;if(i!==void 0&&(r.backgroundColor=i),t.fg!==null){const s=`rgb(${t.fg})`;r.color=i===void 0?im[t.fg.replace(/\s+/g,"")]??s:s}for(const s of t.decorations)Object.assign(r,om[s]);return Object.keys(r).length===0?void 0:r}

function vm(t){let r=[];const i=[r];for(const s of df.ansiToJson(mm(t),{json:!0,remove_empty:!0})){const a=gm(s);for(const[c,h]of s.content.split(`
`).entries())c>0&&(r=[],i.push(r)),h!==""&&r.push({text:h,style:a})}return i}

function K6(t,r,i){const s=t-r,a=Math.ceil(r/2);return{hidden:s,capped:s>0&&!i,headLines:a,tailLines:r-a}}

const ym=1e3;

function X6(t){const[r,i]=I.useState(!1);return{copied:r,onCopy:I.useCallback(()=>{r||Rn(t).then(s=>{s&&(i(!0),window.setTimeout(()=>{i(!1)},ym))})},[r,t])}}

function xm(t,r){const i=t.replace(/[/\\]+$/,"");if(r!==void 0&&i===r.replace(/[/\\]+$/,""))return"~";const s=i.split(/[/\\]/).pop();return s===void 0||s===""?t:s}

function J6(t,r,i){if(r!==void 0)return i.signal(r);if(t!==void 0&&t!==0)return i.exitCode(t)}

function _m(t,r,i,s){return t?{state:"ongoing",label:s.running}:J6(r,i,s)!==void 0?{state:"error",label:s.failed}:{state:"done",label:s.done}}

function O5(t){return t.map((r,i)=>r.style===void 0?r.text:d.jsx("span",{style:r.style,children:r.text},i))}

function km({command:t,cwd:r,home:i,output:s,exitCode:a,signal:c,running:h=!1,maxLines:p=16,className:m,labels:g}){const v=g,w=s??"",x=I.useMemo(()=>{const V=vm(w),ie=V[V.length-1];return V.length>1&&ie!==void 0&&ie.every(he=>he.text==="")?V.slice(0,-1):V},[w]),[k,_]=I.useState(!1),{copied:b,onCopy:T}=X6(w),H=I.useCallback(()=>{_(V=>!V)},[]),$=J6(a,c,v),Q=_m(h,a,c,v),F=I.useMemo(()=>(t.endsWith(`
`)?t.slice(0,-1):t).split(`
`),[t]),W=x.every(V=>V.every(ie=>ie.text.trim()==="")),{hidden:z,capped:B,headLines:G,tailLines:P}=K6(x.length,p,k);return d.jsxs("div",{className:Ce(i1.block,m),"data-terminal":"","data-running":h?"":void 0,children:[d.jsxs("div",{className:i1.header,children:[d.jsxs("div",{className:i1.prompt,children:[d.jsx("span",{className:i1.runStateLabel,children:Q.label}),F.map((V,ie)=>d.jsxs("div",{className:i1.promptLine,children:[ie===0&&d.jsx(O6,{state:Q.state,className:i1.runState}),d.jsx("span",{className:i1.cwd,children:ie>0||r===void 0?"$":xm(r,i)}),d.jsx("span",{className:i1.command,children:V})]},ie))]}),$!==void 0&&d.jsx(D6,{className:i1.status,children:$}),!h&&!W&&d.jsx("button",{type:"button",className:i1.copyButton,onClick:T,children:b?v.copied:v.copy})]}),!h&&(W?d.jsx("div",{className:i1.empty,children:v.noOutput}):d.jsxs("div",{className:i1.output,children:[(B?x.slice(0,G):x).map((V,ie)=>d.jsx("div",{className:i1.line,children:O5(V)},ie)),z>0&&d.jsx("button",{type:"button",className:i1.expand,"aria-expanded":k,"aria-label":k?v.collapseAria:v.expandAria(z),onClick:H,children:k?v.collapse:v.expand(z)}),B&&x.slice(x.length-P).map((V,ie)=>d.jsx("div",{className:i1.line,children:O5(V)},ie))]}))]})}

export { km as NativeTerminalBlock }

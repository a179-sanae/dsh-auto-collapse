import type { WorkKind } from './work-groups.js';
export type WorkStatus = 'running' | 'done' | 'error' | 'stopped' | 'waiting';
export interface WorkInfo {
    kind: WorkKind;
    action: string;
    detail: string;
    status: WorkStatus;
}
export interface GroupSummary {
    text: string;
    detail: string;
    status: WorkStatus;
    kind: WorkKind;
}
export declare function toolAction(tool: string): string;
export declare function normalizeStatus(value: string | null): WorkStatus;
export declare function summarize(infos: readonly WorkInfo[]): GroupSummary;

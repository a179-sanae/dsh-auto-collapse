import type { WorkItem } from './work-model.js';
import { type WorkInfo } from './summary.js';
export declare function readWorkInfo(item: WorkItem): WorkInfo;
export declare function needsAttention(items: readonly WorkItem[], infos: ReadonlyMap<string, WorkInfo>): boolean;

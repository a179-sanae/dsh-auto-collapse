import type { WorkItem } from './work-model.js';
import type { GroupSummary } from './summary.js';
export interface PreparedGroup {
    id: string;
    expanded: boolean;
    summary: GroupSummary;
    anchor?: HTMLElement;
    desired: Set<HTMLElement>;
}
/** Own only group overlays and reversible hidden attributes, never native content or inline styles. */
export declare class GroupView {
    private readonly flow;
    private readonly toggle;
    private readonly owner;
    private readonly rows;
    private readonly leases;
    private readonly writes;
    private readonly displays;
    private readonly style;
    constructor(flow: HTMLElement, toggle: (id: string) => void);
    private writeHidden;
    ownMutation(record: MutationRecord): boolean;
    clearWrites(): void;
    detachedGroups(nodes: readonly Node[]): string[];
    beginRead(): void;
    private fold;
    private release;
    private externallyHidden;
    private create;
    summarize(id: string, summary: GroupSummary, expanded: boolean): void;
    prepare(id: string, items: readonly WorkItem[], expanded: boolean, summary: GroupSummary): PreparedGroup;
    apply({ id, expanded, summary, anchor, desired }: PreparedGroup): void;
    focus(id: string): void;
    remove(id: string): void;
    dispose(): void;
}

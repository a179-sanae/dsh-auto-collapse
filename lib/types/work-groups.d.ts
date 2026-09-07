/** DOM-independent, ordered work grouping. Prose and turn changes are boundaries. */
export type WorkKind = 'think' | 'tool' | 'context' | 'command';
export type FlowToken = {
    type: 'work';
    id: string;
    turn: string | null;
    kind: WorkKind;
} | {
    type: 'boundary';
    id: string;
    turn: string | null;
    hard: boolean;
};
export interface WorkGroup {
    id: string;
    turn: string | null;
    items: readonly string[];
}
/** Unscoped context can inherit an unambiguous adjacent turn, never across a user fence. */
export declare function resolveTurns(tokens: readonly FlowToken[]): FlowToken[];
export declare function groupWork(tokens: readonly FlowToken[]): WorkGroup[];
/** Expansion belongs to a work interval, not its current running item or DOM node. */
export declare class GroupState {
    private groups;
    private expanded;
    reconcile(groups: readonly WorkGroup[]): void;
    isExpanded(id: string): boolean;
    setExpanded(id: string, value: boolean): void;
    clear(): void;
}

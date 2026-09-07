import type { FlowToken, WorkKind } from './work-groups.js';
export interface WorkItem {
    id: string;
    turn: string | null;
    kind: WorkKind;
    seat: HTMLElement;
    row: HTMLElement;
    /** Largest ancestor proved to contain only work, never a prose ancestor. */
    cover: HTMLElement;
    /** DSH leaves scoped system prompts outside its native process membership. */
    followNativeTurn: boolean;
}
export interface WorkSnapshot {
    tokens: FlowToken[];
    items: Map<string, WorkItem>;
}
/** Cache structure per host seat. Text inside a work row does not invalidate this index. */
export declare class WorkModel {
    private seats;
    private identities;
    private sequence;
    read(flow: HTMLElement, dirty: ReadonlySet<HTMLElement>, force?: boolean): WorkSnapshot;
    clear(): void;
}

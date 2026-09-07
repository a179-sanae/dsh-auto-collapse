/** Native L1 owns turns; this controller owns only mixed-work L2 groups. */
export declare class FoldController {
    private flow;
    private observer;
    private view;
    private readonly model;
    private readonly state;
    private readonly scheduler;
    private readonly status;
    private items;
    private groups;
    private infos;
    private itemGroups;
    private rowItems;
    private seatGroups;
    private turnGroups;
    private controls;
    private readonly dirtySeats;
    private readonly dirtyItems;
    private readonly dirtyGroups;
    private modelDirty;
    private discover;
    private force;
    private started;
    private disposed;
    private lastError;
    private readonly stats;
    private readonly ready;
    private readonly visible;
    private readonly reveal;
    constructor(statusText?: () => string | undefined);
    start(): void;
    refresh(): void;
    refreshStatus(): void;
    /** Small diagnostics for regressions/performance, never rendered into the chat. */
    diagnostics(): Readonly<typeof this.stats> & {
        groups: number;
        items: number;
    };
    private itemAt;
    private dirtySeatGroups;
    private mutations;
    private switchFlow;
    private rebuild;
    private prepare;
    private flush;
    private toggle;
    private revealAt;
    stop(): void;
}

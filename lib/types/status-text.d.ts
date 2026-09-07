/** Optional status copy is independent of work grouping and never reads message text. */
export declare class StatusTextController {
    private readonly read;
    private flow;
    private observer;
    private readonly texts;
    private readonly scheduler;
    constructor(read: () => string | undefined);
    setFlow(flow: HTMLElement | null): void;
    refresh(): void;
    private update;
    private restore;
    dispose(): void;
}

/** One coalesced frame, with a background-tab fallback; no polling/audit loop. */
export declare class Scheduler {
    private readonly run;
    private frame;
    private timeout;
    private disposed;
    constructor(run: () => void);
    schedule(): void;
    dispose(): void;
}

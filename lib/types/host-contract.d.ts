/** DSH 0.1.2 DOM contract. Keep host recognition separate from grouping and rendering. */
export declare const FLOW = "[data-chat-flow]";
export declare const SEAT = "[data-chat-flow-kind]";
export declare const OWNED = "[data-dshcf-group]";
export declare const FOLDED = "data-dshcf-folded";
export declare const NATIVE_HIDDEN = "[data-turn-process-hidden], [data-turn-process-inline]";
export declare function elementOf(node: Node): Element | null;
export declare function pluginOwned(node: Node): boolean;
export declare function seatOf(node: Node, flow: HTMLElement): HTMLElement | null;
export declare function seatKey(seat: HTMLElement): string | null;
export declare function nativeHidden(row: HTMLElement, flow: HTMLElement): boolean;
export declare function nativeOwnsHidden(element: HTMLElement): boolean;
export declare function findFlow(): HTMLElement | null;
export declare function nativeControls(flow: HTMLElement): Map<string, HTMLButtonElement>;
export declare function openNative(button: HTMLButtonElement | undefined): void;
export declare const OBSERVED_ATTRIBUTES: string[];

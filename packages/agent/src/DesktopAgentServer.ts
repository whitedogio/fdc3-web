import { Context } from "@finos/fdc3-types"

export interface DesktopAgentServer {
    start(): Promise<void>;
    stop(): Promise<void>;
    open(name: string, context?: Context): void;
    openInFrame(container: HTMLElement, name: string, context?: Context): Promise<void>
    Apps: object[]
}

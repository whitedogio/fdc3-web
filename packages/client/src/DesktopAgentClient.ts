import { Channel, Context, DesktopAgent } from "@finos/fdc3";

export interface DesktopAgentClient extends DesktopAgent {
    initialize(): Promise<void>;
    connect(): Promise<Channel>;
    getInitialContext(): Context;
}
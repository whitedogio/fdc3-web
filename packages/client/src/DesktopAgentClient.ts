import { Channel, Context, DesktopAgent } from "@finos/fdc3-types";

export interface DesktopAgentClient extends DesktopAgent {
    initialize(): Promise<void>;
    connect(): Promise<Channel>;
    getInitialContext(): Context;
}
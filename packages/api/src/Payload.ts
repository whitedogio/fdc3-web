import { Channel, Context } from "@finos/fdc3"

export interface Payload {
    instanceId: string;
    action: string;
    channel?: Channel;
    context?: Context & { type: string }
    listenerId?: string
    error?: Error
    channels?: Channel[];
}

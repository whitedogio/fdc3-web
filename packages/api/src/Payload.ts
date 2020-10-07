import { Channel, Context } from "@finos/fdc3-types"

export interface Payload {
    instanceId: string;
    action: string;
    channel?: Channel;
    context?: Context & { type: string }
    listenerId?: string
    error?: Error
    channels?: Channel[];
}

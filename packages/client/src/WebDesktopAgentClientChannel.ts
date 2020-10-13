import { Channel, Context, ContextHandler, DisplayMetadata, Listener } from "@finos/fdc3";
import { ADD_CONTEXT_LISTENER, BROADCAST, Payload, REMOVE_CONTEXT_LISTENER } from "@whitedog/fdc3-web-api";
import cuid from "cuid";

export class WebDesktopAgentClientChannel implements Channel {
    static FromChannel(deliver: (payload: Payload) => void, channel: Channel): WebDesktopAgentClientChannel {
        return new WebDesktopAgentClientChannel(deliver, channel.id, channel.type, channel.displayMetadata);
    }

    private readonly _contexts: Map<string, Context> = new Map<string, Context>();
    private readonly _handlers: Map<string, Set<ContextHandler>> = new Map<string, Set<ContextHandler>>();

    private readonly _deliver: (payload: Payload) => void;

    constructor(deliver: (payload: Payload) => void, id: string, type: string, displayMetadata?: DisplayMetadata) {
        this._deliver = deliver;
        this._id = id;
        this._type = type;
        this._displayMetadata = displayMetadata;
    }

    private _id: string;
    public get id(): string {
        return this._id;
    }

    private _type: string;
    public get type(): string {
        return this._type;
    }

    private _displayMetadata: DisplayMetadata;
    public get displayMetadata(): DisplayMetadata {
        return this._displayMetadata;
    }

    broadcast(context: Context): void {
        this.deliver({
            action: BROADCAST,
            context: context
        } as Payload);
    }

    getCurrentContext(contextType?: string): Promise<Context> {
        return Promise.resolve(this._contexts.get(contextType));
    }

    addContextListener(a: ContextHandler | string, b?: ContextHandler): Listener {
        let handler: ContextHandler = a as ContextHandler;
        let type: string = null;

        if (typeof a !== "function") {
            type = a as string;
            handler = b;
        }

        let handlers = this._handlers.get(type);
        if (!handlers) {
            handlers = new Set<ContextHandler>();
            this._handlers.set(type, handlers);
        }

        handlers.add(handler);

        const listenerId = cuid();

        this.deliver({
            action: ADD_CONTEXT_LISTENER,
            listenerId
        } as Payload);

        return {
            unsubscribe: () => {
                this.deliver({
                    action: REMOVE_CONTEXT_LISTENER,
                    listenerId: listenerId
                } as Payload);

                handlers.delete(handler);
            }
        };
    }

    handleBroadcast(context: Context & { type: string }): void {
        if (!context.type) {
            throw new Error("Unable to broadcast context with no type.");
        }

        this._contexts.set(null, context);
        this._contexts.set(context.type, context);

        const untypedHandlers = this._handlers.get(null);
        if (untypedHandlers) {
            untypedHandlers.forEach(handler => {
                handler(context);
            });
        }

        const typedHandlers = this._handlers.get(context.type);
        if (typedHandlers) {
            typedHandlers.forEach(handler => {
                handler(context);
            });
        }
    }

    private deliver(payload: Exclude<Payload, "instanceId" | "channel">): void {
        payload = { ...payload, channel: { type: this.type, id: this.id } } as Payload;
        this._deliver(payload);
    }
}

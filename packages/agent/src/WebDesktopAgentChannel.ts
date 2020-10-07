import { Channel, Context, ContextHandler, DisplayMetadata, Listener } from "@finos/fdc3-types";

type ContextType = string;

export class WebDesktopAgentChannel implements Channel {
    private readonly _contexts: Map<ContextType, Context> = new Map<ContextType, Context>();
    private readonly _handlers: Map<ContextType, Set<ContextHandler>> = new Map<ContextType, Set<ContextHandler>>();

    constructor(id: string, type = "system", displayMetadata?: DisplayMetadata) {
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

    public addContextListener(a: ContextHandler | string, b?: ContextHandler): Listener {
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

        return { unsubscribe: () => { handlers.delete(handler); } };
    }

    public broadcast(context: Context & { type: string }): void {
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

    public getCurrentContext(type: string = null): Promise<Context> {
        return Promise.resolve(this._contexts.get(type));
    }
}

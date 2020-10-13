import { Channel, Context, ContextHandler, Listener } from "@finos/fdc3";
import { ADD_CONTEXT_LISTENER, ADD_INTENT_LISTENER, BROADCAST, CONNECT, GET_SYSTEM_CHANNELS, JOIN_CHANNEL, Payload, RAISE_INTENT, REMOVE_CONTEXT_LISTENER, REMOVE_INTENT_LISTENER } from "@whitedog/fdc3-web-api";
import cuid from "cuid";
import { DesktopAgentServer } from "./DesktopAgentServer";
import { WebDesktopAgentChannel } from "./WebDesktopAgentChannel";
import { WebDesktopAgentClientWindow } from "./WebDesktopAgentClientWindow";

type ListenerId = string;
type IntentName = string;
type ChannelId = string;

export class WebDesktopAgentServer implements DesktopAgentServer {
    private readonly GLOBAL_CHANNEL_ID = "global";

    private readonly _fdc3Origin: string = window.location.origin;
    private readonly _window: Window = window;

    private readonly _childWindows: Map<string, WebDesktopAgentClientWindow> = new Map<string, WebDesktopAgentClientWindow>();
    private readonly _listeners: Map<ListenerId, Listener> = new Map<ListenerId, Listener>();
    private readonly _systemChannels: Map<ChannelId, Channel> = new Map<ChannelId, Channel>();
    private readonly _globalChannel = () => this._systemChannels.get(this.GLOBAL_CHANNEL_ID);
    private readonly _intentHandlers: Map<IntentName, Set<[ListenerId, ContextHandler]>> = new Map<IntentName, Set<[ListenerId, ContextHandler]>>();

    private _cleanupIntervalId: number;

    constructor() {
        const globalChannel = new WebDesktopAgentChannel(this.GLOBAL_CHANNEL_ID);
        this._systemChannels.set(this.GLOBAL_CHANNEL_ID, globalChannel);

        for (const c of ["red", "green", "blue", "yellow", "orange", "purple", "pink"].map(c => new WebDesktopAgentChannel(c, "system", { color: c }))) {
            this._systemChannels.set(c.id, c);
        }
    }

    private _apps: { url: string, intents: { name: string }[] }[];
    public get Apps(): { url: string, intents: { name: string }[] }[] {
        return this._apps;
    }
    public set Apps(v: { url: string, intents: { name: string }[] }[]) {
        this._apps = v;
    }

    public start(): Promise<void> {
        this._cleanupIntervalId = this._window.setInterval(() => {
            this._childWindows.forEach((value, key, map) => {
                if (value.Window.closed) {
                    value.closeListeners();
                    map.delete(key);
                }
            });
        }, 5000);

        this._window.addEventListener("message", this.handleWindowMessage.bind(this));

        console.log(`Started FDC3 WebDesktopAgentServer, origin=${this._fdc3Origin}`);

        return Promise.resolve();
    }

    public stop(): Promise<void> {
        this._window.clearInterval(this._cleanupIntervalId);
        this._window.removeEventListener("message", this.handleWindowMessage.bind(this));

        return Promise.resolve();
    }

    public open(name: string, context?: Context): Promise<void> {
        const id = cuid();

        const url = new URL(name);
        url.searchParams.append("fdc3-id", encodeURIComponent(id));
        url.searchParams.append("fdc3-origin", encodeURIComponent(this._fdc3Origin));
        url.searchParams.append("fdc3-context", encodeURIComponent(JSON.stringify(context || {})));

        const urlString = url.toString();

        const childWindow = window.open(urlString, "_blank");

        const clientWindow = new WebDesktopAgentClientWindow(id, name, childWindow, url.origin);
        this._childWindows.set(id, clientWindow);

        console.log(`Launched '${name}', appId=${id}`);

        return Promise.resolve();
    }

    public openInFrame(container: HTMLElement, name: string, context?: Context): Promise<void> {
        const id = cuid();

        const url = new URL(name);
        url.searchParams.append("fdc3-id", encodeURIComponent(id));
        url.searchParams.append("fdc3-origin", encodeURIComponent(this._fdc3Origin));
        url.searchParams.append("fdc3-context", encodeURIComponent(JSON.stringify(context || {})));

        const urlString = url.toString();

        const iframe = document.createElement("iframe");
        iframe.src = urlString;

        container.appendChild(iframe);

        const clientWindow = new WebDesktopAgentClientWindow(id, name, iframe.contentWindow, url.origin);
        this._childWindows.set(id, clientWindow);

        console.log(`Launcher '${name}', appId='${id}' in iframe`);

        return Promise.resolve();
    }

    private handleWindowMessage(evt: MessageEvent) {
        if (Array.from(this._childWindows.values()).map(w => w.Window).indexOf(evt.source as Window) < 0) {
            return;
        }

        if (!evt.data) {
            throw new Error("Unable to handle MessageEvent with no data.");
        }

        const payload = evt.data as Payload;

        if (!payload) {
            throw new Error("Unable to handle MessageEvent data as it is not a valid payload.");
        }

        console.log("agent 🡆", payload);

        if (!evt.data.instanceId) {
            throw new Error("Unable to handle MessageEvent data payload with no instanceId.");
        }

        const childWindow = this._childWindows.get(payload.instanceId);
        if (!childWindow) {
            return;
        }

        switch (payload.action) {
            case CONNECT: {
                const channel = this._globalChannel();

                childWindow.IsConnected = true;

                childWindow.deliver({
                    instanceId: payload.instanceId,
                    action: JOIN_CHANNEL,
                    channel: { type: channel.type, id: channel.id } as Channel
                });

                break;
            }

            case ADD_CONTEXT_LISTENER: {
                const channel = payload.channel.type == "system"
                    ? this._systemChannels.get(payload.channel.id)
                    : null;

                if (!channel) {
                    childWindow.deliver({ ...payload, error: new Error("Channel does not exist") });
                    return;
                }

                const listenerId = payload.listenerId || cuid();

                const listener = channel.addContextListener((context: Context & { type: string }) => {
                    childWindow.deliver({
                        instanceId: payload.instanceId,
                        action: BROADCAST,
                        channel: payload.channel,
                        listenerId: listenerId,
                        context: context
                    })
                });

                this._listeners.set(listenerId, listener);
                childWindow.addListener(listener);

                childWindow.deliver({
                    instanceId: payload.instanceId,
                    action: ADD_CONTEXT_LISTENER,
                    channel: payload.channel,
                    listenerId: listenerId
                });

                break;
            }

            case REMOVE_CONTEXT_LISTENER: {
                const channel = payload.channel.type == "system"
                    ? this._systemChannels.get(payload.channel.id)
                    : null;

                if (!channel) {
                    childWindow.deliver({ ...payload, error: new Error("Channel does not exist") });
                    return;
                }

                const listener = this._listeners.get(payload.listenerId);

                if (!listener) {
                    childWindow.deliver({ ...payload, error: new Error("Listener does not exist") });
                    return;
                }

                listener.unsubscribe();

                childWindow.deliver({
                    instanceId: payload.instanceId,
                    action: REMOVE_CONTEXT_LISTENER,
                    channel: payload.channel,
                    listenerId: payload.listenerId
                });

                break;
            }

            case BROADCAST: {
                const channel = payload.channel.type == "system"
                    ? this._systemChannels.get(payload.channel.id)
                    : null;

                if (!channel) {
                    childWindow.deliver({ ...payload, error: new Error("Channel does not exist") });
                    return;
                }

                channel.broadcast(payload.context);

                break;
            }

            case RAISE_INTENT: {
                const intent = payload.intent;
                const handlers = this._intentHandlers.get(intent);

                if (handlers && handlers.size > 0) {
                    // If something has registered a handler for the intent trigger it
                    for (const handler of this._intentHandlers.get(intent)) {
                        console.log("Delivering");
                        handler[1](payload.context);
                    }
                } else {
                    // Otherwise, find the first app that supports the intent and open it, passing the context
                    const app = this.Apps.find(a => a.intents.findIndex(i => i.name === intent) >= 0);
                    if (app) {
                        this.open(app.url, payload.context);
                    }
                }

                break;
            }

            case ADD_INTENT_LISTENER: {
                const intent = payload.intent;

                let handlers = this._intentHandlers.get(intent);
                if (!handlers) {
                    handlers = new Set<[ListenerId, ContextHandler]>();
                    this._intentHandlers.set(intent, handlers);
                }

                const listenerId = payload.listenerId || cuid();

                const handler = (context: Context) => {
                    console.log("Delivering 2");
                    console.log(childWindow);
                    childWindow.deliver({
                        instanceId: payload.instanceId,
                        listenerId: listenerId,
                        intent: payload.intent,
                        context: context,
                        action: RAISE_INTENT
                    } as Payload);
                };

                const h: [ListenerId, ContextHandler] = [listenerId, handler];
                handlers.add(h);

                const listener = { unsubscribe: () => { handlers.delete(h); } };
                childWindow.addListener(listener);

                return listener;
            }

            case REMOVE_INTENT_LISTENER: {
                break;
            }

            case JOIN_CHANNEL: {
                const channel = payload.channel.type == "system"
                    ? this._systemChannels.get(payload.channel.id)
                    : null;

                if (!channel) {
                    childWindow.deliver({ ...payload, error: new Error("Channel does not exist") });
                    return;
                }

                childWindow.deliver({
                    instanceId: payload.instanceId,
                    action: JOIN_CHANNEL,
                    channel: payload.channel
                });

                break;
            }

            case GET_SYSTEM_CHANNELS: {
                childWindow.deliver({
                    instanceId: payload.instanceId,
                    action: GET_SYSTEM_CHANNELS,
                    channels: Array.from(this._systemChannels.values()).map(c => { return { type: c.type, id: c.id, displayMetadata: c.displayMetadata } as Channel })
                });

                break;
            }

            default:
                childWindow.deliver({ ...payload, error: new Error("Invalid action") });

                break;
        }
    }
}

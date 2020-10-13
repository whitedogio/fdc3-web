import { AppIntent, Channel, Context, ContextHandler, IntentResolution, Listener } from "@finos/fdc3";
import { ADD_CONTEXT_LISTENER, ADD_INTENT_LISTENER, BROADCAST, CONNECT, GET_SYSTEM_CHANNELS, JOIN_CHANNEL, OPEN, Payload, RAISE_INTENT, REMOVE_INTENT_LISTENER } from "@whitedog/fdc3-web-api";
import cuid from "cuid";
import { DesktopAgentClient } from "./DesktopAgentClient";
import { WebDesktopAgentClientChannel } from "./WebDesktopAgentClientChannel";

export class WebDesktopAgentClient implements DesktopAgentClient {
    private _fdc3Origin: string;
    private _fdc3InstanceId: string;
    private _fdc3Context: Context;
    private _parentWindow: Window;

    private _initialized = false;
    private _connected = false;
    private _channel: WebDesktopAgentClientChannel;
    private _newSystemChannels = false;
    private _systemChannels: WebDesktopAgentClientChannel[] = new Array<WebDesktopAgentClientChannel>();
    private readonly _intentHandlers: Map<string, Set<ContextHandler>> = new Map<string, Set<ContextHandler>>();

    initialize(): Promise<void> {
        if (this._initialized) { return Promise.resolve(); }

        const params = new URLSearchParams(window.location.search);

        if (!(params.has("fdc3-origin") && params.has("fdc3-id"))) {
            return Promise.reject("Unable to initialise as fdc3-origin and/or fdc3-id were not supplied.");
        }

        this._fdc3Origin = decodeURIComponent(params.get("fdc3-origin"));
        this._fdc3InstanceId = decodeURIComponent(params.get("fdc3-id"));

        if (params.has("fdc3-context")) {
            this._fdc3Context = JSON.parse(decodeURIComponent(params.get("fdc3-context"))) as Context;
        }

        this._parentWindow = window.location !== window.parent.location ? window.parent : window.opener;

        console.log(`Initialized FDC3 WebDesktopAgentClient: fdc3Origin=${this._fdc3Origin}, appId=${this._fdc3InstanceId}, initialContext=`, this._fdc3Context);

        this._initialized = true;
        return Promise.resolve();
    }

    connect(): Promise<Channel> {
        if (this._connected) { return Promise.resolve(this._channel); }

        window.onmessage = this.handleWindowMessage.bind(this);

        this.deliver({
            instanceId: this._fdc3InstanceId,
            action: CONNECT
        });

        return new Promise(resolve => {
            setTimeout(() => {
                if (this._channel) {
                    this._connected = true;
                    window.dispatchEvent(new CustomEvent("fdc3.connected", { detail: { channel: this._channel } }));
                    resolve(this._channel);
                }
            }, 0);

            setTimeout(() => {
                if (this._channel) {
                    this._connected = true;
                    window.dispatchEvent(new CustomEvent("fdc3.connected", { detail: { channel: this._channel } }));
                    resolve(this._channel);
                }
            }, 100);
        });
    }

    private handleWindowMessage(evt: MessageEvent) {
        if (!(evt.data && evt.data.action)) { return; }

        const payload = evt.data as Payload;

        console.log(this._fdc3InstanceId + " 🡆", payload);

        switch (evt.data.action) {
            case JOIN_CHANNEL:
                if (!payload.error) {
                    let channel = this._systemChannels.find(c => c.type === payload.channel.type && c.id === payload.channel.id);

                    if (!channel) {
                        channel = WebDesktopAgentClientChannel.FromChannel(this.deliver.bind(this), payload.channel);
                        this._systemChannels.push(channel);
                    }

                    this._channel = channel;
                }
                break;
            case BROADCAST: {
                const channel = this._systemChannels.find(c => c.type === payload.channel.type && c.id === payload.channel.id);
                channel.handleBroadcast(payload.context);
                break;
            }
            case ADD_CONTEXT_LISTENER:
                break;
            case GET_SYSTEM_CHANNELS: {
                if (!payload.error) {
                    for (const channel of payload.channels) {
                        if (!this._systemChannels.find(c => c.type === channel.type && c.id === channel.id)) {
                            this._systemChannels.push(WebDesktopAgentClientChannel.FromChannel(this.deliver.bind(this), channel));
                        }
                    }

                    // TODO: Handle removed channels.

                    this._newSystemChannels = true;
                }

                break;
            }
            case RAISE_INTENT: {
                const intent = payload.intent;
                const handlers = this._intentHandlers.get(intent);

                for (const handler of handlers) {
                    handler(payload.context);
                }
                
                break;
            }
            default:
                console.error(`Unrecognised action '${evt.data.action}`, evt.data);
        }
    }

    getInitialContext(): Context {
        return this._fdc3Context;
    }

    broadcast(context: Context): void {
        this._channel.broadcast(context);
    }

    addContextListener(a: string | ContextHandler, b?: ContextHandler): Listener {
        return this._channel.addContextListener(a, b);
    }

    open(name: string, context?: Context): Promise<void> {
        this.deliver({
            instanceId: this._fdc3InstanceId,
            action: OPEN,
            name,
            context
        } as Payload);

        return Promise.resolve();
    }

    findIntent(intent: string, context?: Context): Promise<AppIntent> {
        throw new Error("Method not implemented.");
    }

    findIntentsByContext(context: Context): Promise<AppIntent[]> {
        throw new Error("Method not implemented.");
    }

    raiseIntent(intent: string, context: Context, target?: string): Promise<IntentResolution> {
        this.deliver({
            instanceId: this._fdc3InstanceId,
            action: RAISE_INTENT,
            intent: intent,
            context: context,
            target: target
        } as Payload);

        return Promise.resolve({} as IntentResolution);
    }

    addIntentListener(intent: string, handler: ContextHandler): Listener {
        let handlers = this._intentHandlers.get(intent);
        if (!handlers) {
            handlers = new Set<ContextHandler>();
            this._intentHandlers.set(intent, handlers);
        }

        handlers.add(handler);

        const listenerId = cuid();

        this.deliver({
            action: ADD_INTENT_LISTENER,
            listenerId,
            intent: intent
        } as Payload);

        return {
            unsubscribe: () => {
                this.deliver({
                    action: REMOVE_INTENT_LISTENER,
                    intent: intent,
                    listenerId: listenerId
                } as Payload);

                handlers.delete(handler);
            }
        };
    }

    getOrCreateChannel(channelId: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }

    getSystemChannels(): Promise<Channel[]> {
        this.deliver({
            instanceId: this._fdc3InstanceId,
            action: GET_SYSTEM_CHANNELS,
        } as Payload);

        return new Promise((resolve, reject) => {
            if (this._newSystemChannels) {
                resolve(this._systemChannels);
            }

            setTimeout(() => {
                if (this._newSystemChannels) {
                    this._newSystemChannels = false;
                    resolve(this._systemChannels);
                }

                reject();
            }, 100);
        });
    }

    joinChannel(channelId: string): Promise<void> {
        this.deliver({
            instanceId: this._fdc3InstanceId,
            action: JOIN_CHANNEL,
            channel: { type: "system", id: channelId }
        } as Payload);

        return new Promise((resolve, reject) => {
            if (this._channel.type === "system" && this._channel.id === channelId) {
                resolve();
            }

            setTimeout(() => {
                if (this._channel.type === "system" && this._channel.id === channelId) {
                    resolve();
                }

                reject();
            }, 100);
        });
    }

    getCurrentChannel(): Promise<Channel> {
        return new Promise(resolve => {
            setTimeout(() => resolve(this._channel), 100);
        });
    }

    leaveCurrentChannel(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    private deliver(payload: Exclude<Payload, "instanceId">): void {
        payload.instanceId = this._fdc3InstanceId;
        console.log(this._fdc3InstanceId + " 🡄", payload);
        this._parentWindow.postMessage(payload, this._fdc3Origin);
    }
}

import { Listener } from "@finos/fdc3";
import { Payload } from "@whitedog/fdc3-web-api";

export class WebDesktopAgentClientWindow {
    private readonly _listeners = new Array<Listener>();

    constructor(instanceId: string, name: string, window: Window, origin: string) {
        this._instanceId = instanceId;
        this._name = name;
        this._window = window;
        this._origin = origin;
        this._isConnected = false;
    }

    private readonly _instanceId: string;
    public get InstanceId(): string {
        return this._instanceId;
    }

    private readonly _name: string;
    public get Name(): string {
        return this._name;
    }

    private readonly _origin: string;
    public get Origin(): string {
        return this._origin;
    }

    private readonly _window: Window;
    public get Window(): Window {
        return this._window;
    }

    private _isConnected: boolean;
    public get IsConnected(): boolean {
        return this._isConnected;
    }
    public set IsConnected(v: boolean) {
        this._isConnected = v;
    }

    public deliver(payload: Payload): void {
        console.log("agent 🡄", payload);
        this.Window.postMessage(payload, this._origin);
    }

    public addListener(listener: Listener): void {
        this._listeners.push(listener);
    }

    public closeListeners(): void {
        console.log(`Closing listeners for '${this.InstanceId}'`)
        for (const l of this._listeners) {
            l.unsubscribe();
        }
    }
}

import { Payload } from "@whitedog/fdc3-web-api";
import { WebDesktopAgentClientWindow } from "./WebDesktopAgentClientWindow";

const instanceId = "INSTANCE_ID";
const name = "NAME";
const origin = "ORIGIN";

test("ctor", () => {
    const client = new WebDesktopAgentClientWindow(instanceId, name, window, origin);

    expect(client.InstanceId).toBe(instanceId);
    expect(client.Name).toBe(name);
    expect(client.Window).toBe(window);
    expect(client.Origin).toBe(origin);
    expect(client.IsConnected).toBe(false);
});

test("deliver", () => {
    window.postMessage = jest.fn();

    const client = new WebDesktopAgentClientWindow(instanceId, name, window, origin);

    const payload: Payload = {
        instanceId: instanceId,
        action: "test"
    };

    client.deliver(payload);

    expect(window.postMessage).toBeCalledWith(payload, client.Origin);
});

test("isConnected", () => {
    const client = new WebDesktopAgentClientWindow(instanceId, name, window, origin);
    expect(client.IsConnected).toBe(false);

    client.IsConnected = true;
    expect(client.IsConnected).toBe(true);
});

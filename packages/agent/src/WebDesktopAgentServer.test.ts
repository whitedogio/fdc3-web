import { Channel, Context } from "@finos/fdc3";
import { ADD_CONTEXT_LISTENER, BROADCAST, CONNECT, JOIN_CHANNEL, Payload, REMOVE_CONTEXT_LISTENER } from "@whitedog/fdc3-web-api";
import { WebDesktopAgentServer } from "./WebDesktopAgentServer";

test("ctor", () => {
    const server = new WebDesktopAgentServer();
    expect(server).not.toBeNull();
});

test("startStop", () => {
    const mockWindowAddEventListener = jest.fn();
    window.addEventListener = mockWindowAddEventListener;

    const mockWindowRemoveEventListener = jest.fn();
    window.removeEventListener = mockWindowRemoveEventListener;

    const server = new WebDesktopAgentServer();

    expect(server.start()).resolves.not.toThrow();
    expect(mockWindowAddEventListener).toBeCalledTimes(1);

    expect(server.stop()).resolves.not.toThrow();
    expect(mockWindowRemoveEventListener).toBeCalledTimes(1);
});

test("handleWindowMessageForUnknownChileWindowShouldReturn", () => {
    const server = new WebDesktopAgentServer();

    let listener: (event: MessageEvent) => unknown;
    const mockWindowAddEventListener = jest.fn((_, l) => {
        listener = l;
    });
    window.addEventListener = mockWindowAddEventListener;

    server.start();

    expect(() => listener({} as MessageEvent)).not.toThrow();
});

test("handleWindowMessageWithNoDataShouldThrow", () => {
    const name = "http://127.0.0.1";

    const server = new WebDesktopAgentServer();

    let listener: (event: MessageEvent) => unknown;
    const mockWindowAddEventListener = jest.fn((_, l) => {
        listener = l;
    });
    window.addEventListener = mockWindowAddEventListener;

    const w = { location: { origin: "http://127.0.0.1" } } as Window;
    const mockWindowOpen = jest.fn().mockReturnValue(w);
    window.open = mockWindowOpen;

    server.start();

    server.open(name);

    expect(() => listener({ source: w } as MessageEvent)).toThrow();
    expect(() => listener({ source: w, data: {} } as MessageEvent)).toThrow();

    server.stop();
});

test("open", () => {
    const name = "http://127.0.0.1";

    const server = new WebDesktopAgentServer();

    const mockWindowOpen = jest.fn().mockReturnValue({ location: { origin: "http://127.0.0.1" } } as Window);
    window.open = mockWindowOpen;

    expect(server.open(name)).resolves.not.toThrow();
    expect(mockWindowOpen).toBeCalledWith(expect.stringMatching(/http:\/\/127.0.0.1\/\?.*/), "_blank")

    const url = new URL(mockWindowOpen.mock.calls[0][0]);
    expect(global.decodeURIComponent(url.searchParams.get("fdc3-origin"))).toBe("http://localhost");
});

test("connect", () => {
    const server = new WebDesktopAgentServer();

    const mockWindowPostMessage = jest.fn();

    const w = { location: { origin: "http://127.0.0.1" }, postMessage: mockWindowPostMessage } as unknown as Window;
    const mockWindowOpen = jest.fn().mockReturnValue(w);
    window.open = mockWindowOpen;

    let listener: (event: MessageEvent) => unknown;
    const mockWindowAddEventListener = jest.fn((_, l) => {
        listener = l;
    });
    window.addEventListener = mockWindowAddEventListener;

    server.start();
    server.open("http://127.0.0.1");

    const url = new URL(mockWindowOpen.mock.calls[0][0]);
    const instanceId = global.decodeURIComponent(url.searchParams.get("fdc3-id"));

    console.log(url);
    console.log(instanceId);

    listener({
        source: w,
        data: {
            instanceId: instanceId,
            action: CONNECT
        } as Payload
    } as MessageEvent);

    server.stop();

    expect(mockWindowPostMessage).toBeCalledWith({
        instanceId: instanceId,
        action: JOIN_CHANNEL,
        channel: {
            id: "global",
            type: "system"
        }
    } as Payload, "http://127.0.0.1");
});

test("add context listener", () => {
    const server = new WebDesktopAgentServer();

    const mockWindowPostMessage = jest.fn();

    const w = { location: { origin: "http://127.0.0.1" }, postMessage: mockWindowPostMessage } as unknown as Window;
    const mockWindowOpen = jest.fn().mockReturnValue(w);
    window.open = mockWindowOpen;

    let listener: (event: MessageEvent) => unknown;
    const mockWindowAddEventListener = jest.fn((_, l) => {
        listener = l;
    });
    window.addEventListener = mockWindowAddEventListener;

    server.start();
    server.open("http://127.0.0.1");

    const url = new URL(mockWindowOpen.mock.calls[0][0]);
    const id = global.decodeURIComponent(url.searchParams.get("fdc3-id"));

    listener({
        source: w,
        data: {
            instanceId: id,
            action: CONNECT
        } as Payload
    } as MessageEvent);

    const channel = mockWindowPostMessage.mock.calls[0][0].channel as Channel;

    listener({
        source: w,
        data: {
            instanceId: id,
            action: ADD_CONTEXT_LISTENER,
            channel: channel
        } as Payload
    } as MessageEvent);

    expect(mockWindowPostMessage).lastCalledWith({
        instanceId: id,
        action: ADD_CONTEXT_LISTENER,
        channel: channel,
        listenerId: expect.stringMatching(/.+/)
    } as Payload, "http://127.0.0.1");

    server.stop();
});

test("remove context listener", () => {
    const server = new WebDesktopAgentServer();

    const mockWindowPostMessage = jest.fn();

    const w = { location: { origin: "http://127.0.0.1" }, postMessage: mockWindowPostMessage } as unknown as Window;
    const mockWindowOpen = jest.fn().mockReturnValue(w);
    window.open = mockWindowOpen;

    let listener: (event: MessageEvent) => unknown;
    const mockWindowAddEventListener = jest.fn((_, l) => {
        listener = l;
    });
    window.addEventListener = mockWindowAddEventListener;

    server.start();
    server.open("http://127.0.0.1");

    const url = new URL(mockWindowOpen.mock.calls[0][0]);
    const id = global.decodeURIComponent(url.searchParams.get("fdc3-id"));

    listener({
        source: w,
        data: {
            instanceId: id,
            action: CONNECT
        } as Payload
    } as MessageEvent);

    const channel = mockWindowPostMessage.mock.calls[0][0].channel as Channel;

    listener({
        source: w,
        data: {
            instanceId: id,
            action: ADD_CONTEXT_LISTENER,
            channel: channel
        } as Payload
    } as MessageEvent);

    expect(mockWindowPostMessage).lastCalledWith({
        instanceId: id,
        action: ADD_CONTEXT_LISTENER,
        channel: channel,
        listenerId: expect.stringMatching(/.+/)
    } as Payload, "http://127.0.0.1");

    const listenerId = (mockWindowPostMessage.mock.calls[1][0] as Payload).listenerId;

    listener({
        source: w,
        data: {
            instanceId: id,
            action: REMOVE_CONTEXT_LISTENER,
            channel: channel,
            listenerId: listenerId
        } as Payload
    } as MessageEvent);

    expect(mockWindowPostMessage).lastCalledWith({
        instanceId: id,
        action: REMOVE_CONTEXT_LISTENER,
        channel: channel,
        listenerId: listenerId
    } as Payload, "http://127.0.0.1");

    server.stop();
});

test("broadcast", () => {
    const server = new WebDesktopAgentServer();

    const mockWindowPostMessage = jest.fn();

    const w = { location: { origin: "http://127.0.0.1" }, postMessage: mockWindowPostMessage } as unknown as Window;
    const mockWindowOpen = jest.fn().mockReturnValue(w);
    window.open = mockWindowOpen;

    let listener: (event: MessageEvent) => unknown;
    const mockWindowAddEventListener = jest.fn((_, l) => {
        listener = l;
    });
    window.addEventListener = mockWindowAddEventListener;

    server.start();
    server.open("http://127.0.0.1");

    const url = new URL(mockWindowOpen.mock.calls[0][0]);
    const id = global.decodeURIComponent(url.searchParams.get("fdc3-id"));

    listener({
        source: w,
        data: {
            instanceId: id,
            action: CONNECT
        } as Payload
    } as MessageEvent);

    const channel = mockWindowPostMessage.mock.calls[0][0].channel as Channel;

    listener({
        source: w,
        data: {
            instanceId: id,
            action: ADD_CONTEXT_LISTENER,
            channel: channel
        } as Payload
    } as MessageEvent);

    const listenerId = (mockWindowPostMessage.mock.calls[1][0] as Payload).listenerId;

    const context = {
        type: "fdc3.instrument",
        id: {
            ticker: "MSFT"
        }
    } as Context;

    listener({
        source: w,
        data: {
            instanceId: id,
            action: BROADCAST,
            channel: channel,
            context: context
        } as Payload
    } as MessageEvent);

    expect(mockWindowPostMessage).lastCalledWith({
        instanceId: id,
        action: BROADCAST,
        channel: channel,
        listenerId: listenerId,
        context: context
    } as Payload, "http://127.0.0.1");

    server.stop();
});

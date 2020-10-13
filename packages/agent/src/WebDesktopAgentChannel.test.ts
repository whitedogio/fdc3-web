import { Context } from "@finos/fdc3";
import cuid from "cuid";
import { WebDesktopAgentChannel } from "./WebDesktopAgentChannel";

test("ctor", () => {
    const id = cuid();
    const channel = new WebDesktopAgentChannel(id);

    expect(channel).not.toBeNull();
    expect(channel.id).toBe(id);
    expect(channel.type).toBe("system");
});

test("broadcastAndReceiveContext", () => {
    const id = cuid();
    const context = {
        type: "fdc3.instrument",
        id: {
            ticker: "GOOG"
        }
    };

    const channel = new WebDesktopAgentChannel(id);

    const receivedContexts = new Array<Context>();
    const listener = channel.addContextListener(c => {
        receivedContexts.push(c);
    });

    channel.broadcast(context);

    listener.unsubscribe();

    channel.broadcast(context);

    expect(receivedContexts.length).toBe(1);
    expect(receivedContexts[0]).toBe(context);
});

test("broadcastAndReceiveContextByType", () => {
    const id = cuid();

    const context1 = {
        type: "fdc3.instrument",
        id: {
            ticker: "GOOG"
        }
    };

    const context2 = {
        type: "fdc3.contact",
        id: {
            email: "jo.bloggs@example.com"
        }
    };

    const channel = new WebDesktopAgentChannel(id);

    const receivedWildcardContexts = new Array<Context>();
    channel.addContextListener(c => {
        receivedWildcardContexts.push(c);
    });

    const receivedTypedContexts1 = new Array<Context>();
    const listener = channel.addContextListener("fdc3.instrument", c => {
        receivedTypedContexts1.push(c);
    });

    const receivedTypedContexts2 = new Array<Context>();
    channel.addContextListener("fdc3.instrument", c => {
        receivedTypedContexts2.push(c);
    });

    channel.broadcast(context1);

    listener.unsubscribe();

    channel.broadcast(context2);

    expect(receivedWildcardContexts.length).toBe(2);
    expect(receivedWildcardContexts[0]).toBe(context1);
    expect(receivedWildcardContexts[1]).toBe(context2);

    expect(receivedTypedContexts1.length).toBe(1);
    expect(receivedTypedContexts1[0]).toBe(context1);

    expect(receivedTypedContexts2.length).toBe(1);
    expect(receivedTypedContexts2[0]).toBe(context1);
});

test("broadcastAndGetCurrentContextUntyped", () => {
    const id = cuid();
    const context = {
        type: "fdc3.instrument",
        id: {
            ticker: "GOOG"
        }
    };

    const channel = new WebDesktopAgentChannel(id);
    channel.broadcast(context);

    expect(channel.getCurrentContext()).resolves.toBe(context);
});

test("broadcastAndGetCurrentContextTyped", () => {
    const id = cuid();

    const context1 = {
        type: "fdc3.instrument",
        id: {
            ticker: "GOOG"
        }
    };

    const context2 = {
        type: "fdc3.contact",
        id: {
            email: "jo.bloggs@example.com"
        }
    };

    const channel = new WebDesktopAgentChannel(id);
    channel.broadcast(context1);
    channel.broadcast(context2);

    expect(channel.getCurrentContext()).resolves.toBe(context2);
    expect(channel.getCurrentContext("fdc3.instrument")).resolves.toBe(context1);
});

test("broadcastContextWithEmptyTypeThrows", () => {
    const id = cuid();

    const context = {
        type: "",
        id: {
            ticker: "GOOG"
        }
    };

    const channel = new WebDesktopAgentChannel(id);
    expect(() => channel.broadcast(context)).toThrow();
});

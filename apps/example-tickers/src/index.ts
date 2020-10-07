import "@whitedog/fdc3-web-client";

import { DesktopAgentClient } from "@whitedog/fdc3-web-client"

const fdc3 = window.fdc3 as DesktopAgentClient;

fdc3.initialize().then(() => {
    fdc3.connect().then(c => {
        document.title = `[${c.type}/${c.id}] ${document.title}`;

        const broadcastButtons = document.getElementsByClassName("ticker-broadcast") as HTMLCollectionOf<HTMLButtonElement>;
        for (const b of broadcastButtons) {
            b.onclick = () => {
                fdc3.broadcast(buildInstrumentContext(b));
            };
        }

        const intentButtons = document.getElementsByClassName("ticker-intent") as HTMLCollectionOf<HTMLButtonElement>;
        for (const b of intentButtons) {
            b.onclick = () => {
                fdc3.raiseIntent("ShowChart", buildInstrumentContext(b));
            };
        }
    });
});

function buildInstrumentContext(b: HTMLButtonElement): any {
    return {
        type: "fdc3.instrument",
        id: {
            ticker: b.id
        }
    };
}

import "@whitedog/fdc3-web-client";

import { DesktopAgentClient } from "@whitedog/fdc3-web-client"

const fdc3 = window.fdc3 as DesktopAgentClient;

const frame = document.getElementById("frame") as HTMLIFrameElement;

const frameUrlTemplate = "https://api.stockdio.com/visualization/financial/charts/v1/HistoricalPrices?app-key=CC11F1FE49084A96849687C0DE82C267&symbol=#SYMBOL#&dividends=true&splits=true&palette=Financial-Light"
const titleTemplate = "[#CHANNEL#] Stock Chart: #SYMBOL#";

let symbol = "#SYMBOL#";
let channel = "#CHANNEL#"

function updateTitle() {
    document.title = titleTemplate.replace("#SYMBOL#", symbol).replace("#CHANNEL#", channel);
}

fdc3.initialize().then(() => {
    const context = fdc3.getInitialContext();

    console.log("Initial context", context);

    if (context && context.type && context.type === "fdc3.instrument") {
        frame.src = frameUrlTemplate.replace("#SYMBOL#", context.id.ticker);
        symbol = context.id.ticker;
        updateTitle();
    } else {
        fdc3.getCurrentChannel().then(currentChannel => {
            const context = currentChannel.getCurrentContext();
            if (context && context.type && context.type === "fdc3.instrument") {
                frame.src = frameUrlTemplate.replace("#SYMBOL#", context.id.ticker);
                symbol = context.id.ticker;
                updateTitle();
            }
        });
    }

    fdc3.connect().then(c => {
        channel = `${c.type}/${c.id}`;
        updateTitle();

        fdc3.addContextListener(context => {
            if (context.type && context.type === "fdc3.instrument") {
                frame.src = frameUrlTemplate.replace("#SYMBOL#", context.id.ticker);
                symbol = context.id.ticker;
                updateTitle();
            }
        });

        fdc3.addIntentListener("ShowChart", context => {
            if (context.type && context.type === "fdc3.instrument") {
                frame.src = frameUrlTemplate.replace("#SYMBOL#", context.id.ticker);
                symbol = context.id.ticker;
                updateTitle();
            }
        })
    });
});

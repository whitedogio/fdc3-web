import { DesktopAgentServer } from "./DesktopAgentServer";
import { WebDesktopAgentServer } from "./WebDesktopAgentServer";

declare global {
    interface Window {
        fdc3Server: DesktopAgentServer
    }
}

window.fdc3Server = new WebDesktopAgentServer();

export default window.fdc3Server;

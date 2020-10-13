import "@finos/fdc3";
import { WebDesktopAgentClient } from "./WebDesktopAgentClient";
import { DesktopAgentClient } from "./DesktopAgentClient"

export { DesktopAgentClient };

window.fdc3 = new WebDesktopAgentClient();

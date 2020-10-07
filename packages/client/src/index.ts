import "@finos/fdc3-types";
import { WebDesktopAgentClient } from "./WebDesktopAgentClient";
import { DesktopAgentClient } from "./DesktopAgentClient"

export { DesktopAgentClient };

window.fdc3 = new WebDesktopAgentClient();

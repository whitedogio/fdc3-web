import { Button, Card, Classes, Icon, Navbar, NavbarDivider, NavbarGroup, NavbarHeading, ButtonGroup, Popover, Menu, MenuItem } from "@blueprintjs/core";
import fdc3Agent from "@whitedog/fdc3-web-agent";
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Link, Route, Switch } from "react-router-dom";
import apps from "./apps.json";
import "./index.css";

fdc3Agent.Apps = apps;

const Windows = () => {
    const [clients, setClients] = useState([] as { instanceId: string, name: string, isConnected: boolean }[]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setClients(Array.from(fdc3Agent._childWindows.values()));
        }, 250);

        return () => {

            clearInterval(intervalId);
        }
    }, [fdc3Agent._childWindows]);

    return <div>
        {clients.map(w => <div className="offset-bottom-5" key={w.instanceId}>
            <Card>
                <h5>{w.instanceId}</h5>
                <p>{w.name}</p>
                <Icon icon={w.isConnected ? "offline" : "disable"} htmlTitle={w.isConnected ? "Connected" : "Not conencted"} />
            </Card>
        </div>)}
    </div>
}

const Apps = () => {
    return <div>
    </div>
}

const Home = () => {
    const iframeContainerRef = useRef(null);

    return <div>
        {apps.map(a => <ButtonGroup key={a.appId} style={{ marginLeft: "10px", marginBottom: "20px" }}>
            <Button
                large={true}
                onClick={() => window.fdc3Server.open(a.url)}>{a.name}</Button>
            <Popover position="bottom-left" content={
                <Menu>
                    <MenuItem
                        text="Open in iframe"
                        onClick={() => window.fdc3Server.openInFrame(iframeContainerRef.current, a.url)} />
                </Menu>
            }><Button icon="caret-down"></Button></Popover>
        </ButtonGroup>)}
        <div ref={iframeContainerRef} />
    </div>
}

const App = () => {
    return <div>
        <Navbar className="bp3-dark">
            <NavbarGroup>
                <NavbarHeading>Launcher</NavbarHeading>
                <NavbarDivider />
                <Link to="/"><Button className={Classes.MINIMAL} icon="home" text="Home" /></Link>
                <Link to="/windows"><Button className={Classes.MINIMAL} icon="modal" text="Windows" /></Link>
            </NavbarGroup>
        </Navbar>

        <div style={{ marginTop: "10px" }}>
            <Switch>
                <Route path="/apps">
                    <Apps />
                </Route>
                <Route path="/windows">
                    <Windows />
                </Route>
                <Route path="/">
                    <Home />
                </Route>
            </Switch>
        </div>
    </div>
}

ReactDOM.render(
    <Router><App /></Router>,
    document.getElementById('root')
);

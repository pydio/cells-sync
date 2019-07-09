import React from 'react';
// FABRIC UI
import {Customizer, Stack } from 'office-ui-fabric-react';
import {FluentCustomizations, Depths} from '@uifabric/fluent-theme';
import { initializeIcons } from '@uifabric/icons';
import { BrowserRouter as Router, Route} from 'react-router-dom'

import AgentModal from './components/AgentModal'
import {NavMenu, NavRoutes} from './components/Nav'
import EditorPanel from "./components/EditorPanel";
import Socket from "./models/Socket"

initializeIcons();

class App extends React.Component{

    constructor(props){
        super(props);
        this.state = {
            connected: false,
            maxAttemptsReached: false,
            syncTasks: {},
        };
        const onStatus = (status) => this.setState({...status});
        const onTasks = (tasks) => this.setState({syncTasks: tasks});
        this.state.socket = new Socket(onStatus, onTasks);
        this.state.socket.start();
    }

    render(){
        const {socket, connected, connecting, maxAttemptsReached, syncTasks} = this.state;
        return (
            <Customizer {...FluentCustomizations}>
                <Router>
                    <Route render={({history, location}) =>
                        <AgentModal
                            hidden={connected || location.pathname === "/about"}
                            reconnect={socket.forceReconnect.bind(socket)}
                            connecting={connecting}
                            maxAttemptsReached={maxAttemptsReached}
                        />
                    }/>
                    <EditorPanel
                        syncTasks={syncTasks}
                        socket={socket}
                    />
                    <div style={{position:'absolute', top:0, left: 0, right:0, bottom: 0, overflow:'hidden', display:'flex', flexDirection:'column'}}>
                        <Stack horizontal styles={{root:{flex: 2}}}>
                            <Stack.Item align={"stretch"} styles={{root:{boxShadow:Depths.depth4, zIndex: 2, backgroundColor:'rgba(236,239,241,0.6)'}}}>
                                <NavMenu/>
                            </Stack.Item>
                            <Stack.Item grow={true} verticalFill styles={{root:{display:'flex', boxSizing:'border-box', overflowY: 'auto', backgroundColor: '#B0BEC5'}}}>
                                <NavRoutes syncTasks={syncTasks} socket={socket}/>
                            </Stack.Item>
                        </Stack>
                    </div>
                </Router>
            </Customizer>
        );
    }
}

export default App;

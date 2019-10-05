/**
 * Copyright 2019 Abstrium SAS
 *
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */
import React from 'react';
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
            firstAttempt: true,
            connected: false,
            maxAttemptsReached: false,
            syncTasks: {},
        };
        const onStatus = (status) => {
            const other = {}
            if(status && status.connected){
                other.firstAttempt = false;
            }
            this.setState({...status, ...other});
        };
        const onTasks = (tasks) => this.setState({syncTasks: tasks});
        this.state.socket = new Socket(onStatus, onTasks);
        this.state.socket.start();
    }

    render(){
        const {socket, connected, connecting, maxAttemptsReached, firstAttempt, syncTasks} = this.state;
        return (
            <Customizer {...FluentCustomizations}>
                <Router>
                    <Route render={({history, location}) =>
                        <AgentModal
                            hidden={connected || location.pathname === "/about"}
                            reconnect={socket.forceReconnect.bind(socket)}
                            connecting={connecting}
                            firstAttempt={firstAttempt}
                            maxAttemptsReached={maxAttemptsReached}
                            history={history}
                            socket={socket}
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
                            <Stack.Item grow={true} verticalFill styles={{root:{display:'flex', boxSizing:'border-box', backgroundColor: '#B0BEC5'}}}>
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

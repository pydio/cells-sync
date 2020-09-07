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
import {Customizer, Stack, createTheme } from 'office-ui-fabric-react';
import {FluentCustomizations, Depths} from '@uifabric/fluent-theme';
//import { initializeIcons } from '@uifabric/icons';
import { BrowserRouter as Router, Route} from 'react-router-dom'

import AgentModal from './components/AgentModal'
import {NavMenu, NavRoutes} from './components/Nav'
import EditorPanel from "./components/EditorPanel";
import Socket from "./models/Socket"
import { registerIcons } from '@uifabric/styling';
import {AccountCircleOutlined, Sync, Description, Code, InfoOutlined, SettingsOutlined, FlagOutlined,
    KeyboardArrowDown, KeyboardArrowUp, KeyboardArrowRight, KeyboardArrowLeft,
    ErrorOutlineOutlined, DeleteOutline, AddCircleOutline, ArrowRightOutlined, ArrowLeftOutlined,
    PlayArrow, Pause, Stop, SaveOutlined, SettingsBackupRestoreOutlined, MoreVert, OpenInNew,
    CloseOutlined, SyncAltOutlined, ArrowRightAltOutlined, PersonAddOutlined, Replay, Edit,
    FolderOpen, FolderOpenOutlined, CreateNewFolder, ArrowForward, Check,
    DnsOutlined, DataUsageOutlined, WifiTetheringOutlined, CloudDownload,
    CheckBoxOutlineBlankOutlined, CheckBoxOutlined, SignalCellularConnectedNoInternet1Bar} from '@material-ui/icons';
import Colors from "./components/Colors";

registerIcons({
    icons: {
        'AccountBox': <AccountCircleOutlined style={{fontSize:'1em'}}/>,
        'RecurringTask':<Sync style={{fontSize:'1em'}}/>,
        'CustomList':<Description style={{fontSize:'1em'}}/>, // Logs
        'Code':<Code style={{fontSize:'1em'}}/>,
        'Info':<InfoOutlined style={{fontSize:'1em'}}/>,
        'Settings':<SettingsOutlined style={{fontSize:'1em'}}/>,
        'Server':<DnsOutlined style={{fontSize:'1em'}}/>,
        'SyncFolder':<FolderOpenOutlined style={{fontSize:'1em'}}/>,
        'SplitObject':<DataUsageOutlined style={{fontSize:'1em'}}/>,
        'ServerEnviroment':<WifiTetheringOutlined style={{fontSize:'1em'}}/>,
        'Close':<CloseOutlined style={{fontSize:'1em'}}/>,
        'Cancel':<CloseOutlined style={{fontSize:'1em'}}/>,
        'Warning':<ErrorOutlineOutlined style={{fontSize:'1em'}}/>,
        'Sort':<SyncAltOutlined style={{fontSize:'1em', transform:'rotate(90deg)'}}/>,
        'SortDown':<ArrowRightAltOutlined style={{fontSize:'1em', transform:'rotate(90deg)'}}/>,
        'SortUp':<ArrowRightAltOutlined style={{fontSize:'1em', transform:'rotate(-90deg)'}}/>,
        'FolderList':<FolderOpen style={{fontSize:'1em'}}/>,
        'Page':<Description style={{fontSize:'1em'}}/>,
        'FolderOpen':<FolderOpen style={{fontSize:'1em'}}/>,
        'Delete':<DeleteOutline style={{fontSize:'1em'}}/>,
        'NewFolder':<CreateNewFolder style={{fontSize:'1em'}}/>,
        'MoveToFolder':<ArrowForward style={{fontSize:'1em'}}/>,
        'CloudAdd':<PersonAddOutlined style={{fontSize:'1em'}}/>,
        'AddFriend':<PersonAddOutlined style={{fontSize:'1em'}}/>,
        'UserSync':<Replay style={{fontSize:'1em'}}/>,
        'PlugDisconnected':<SignalCellularConnectedNoInternet1Bar style={{fontSize:'1em'}}/>,
        'Checkbox':<CheckBoxOutlineBlankOutlined style={{fontSize:'1em'}}/>,
        'CheckboxComposite':<CheckBoxOutlined style={{fontSize:'1em'}}/>,
        'Flag':<FlagOutlined style={{fontSize:'1em'}}/>,
        'CloudDownload':<CloudDownload style={{fontSize:'1em'}}/>,
        'Save':<SaveOutlined style={{fontSize:'1em'}}/>,
        'Sync':<Sync style={{fontSize:'1em'}}/>,
        'Play':<PlayArrow style={{fontSize:'1em'}}/>,
        'Pause':<Pause style={{fontSize:'1em'}}/>,
        'PlayResume':<PlayArrow style={{fontSize:'1em'}}/>,
        'Add':<AddCircleOutline style={{fontSize:'1em'}}/>,
        'Stop':<Stop style={{fontSize:'1em'}}/>,
        'MoreVertical':<MoreVert style={{fontSize:'1em'}}/>,
        'SyncToPC':<SettingsBackupRestoreOutlined style={{fontSize:'1em'}}/>,
        'OpenInNewWindow':<OpenInNew style={{fontSize:'1em'}}/>,
        'ChevronDown':<KeyboardArrowDown style={{fontSize:'1em'}}/>,
        'ChevronUp':<KeyboardArrowUp style={{fontSize:'1em'}}/>,
        'ChevronRight':<KeyboardArrowRight style={{fontSize:'1em'}}/>,
        'ChevronLeft':<KeyboardArrowLeft style={{fontSize:'1em'}}/>,
        'ArrowRight':<ArrowRightOutlined style={{fontSize:'1em'}}/>,
        'ArrowLeft':<ArrowLeftOutlined style={{fontSize:'1em'}}/>,
        'Edit':<Edit style={{fontSize:'1em'}}/>,
        'Error':<ErrorOutlineOutlined style={{fontSize:'1em'}}/>,
        'CheckMark':<Check style={{fontSize:'1em'}}/>,
        // Used in tree view
        'ChevronRightMed':<KeyboardArrowRight style={{fontSize:'1em', height: 32}}/>,
        'StatusCircleCheckMark':<Check style={{fontSize:'0.8em', margin:'0.2em'}}/>,
    }
});

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
        const fontCusto = {
            settings: {
                theme: createTheme({
                    defaultFontStyle: {
                        fontFamily: 'Roboto',
                        color:'rgba(0,0,0,.87)'
                    },
                })
            },
            scopedSettings:{
                Label: {styles: {root:{fontFamily: 'Roboto Medium'}}}
            }
        };
        return (
            <Customizer {...FluentCustomizations}>
                <Customizer {...fontCusto}>
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
                                <Stack.Item align={"stretch"} styles={{root:{boxShadow:Depths.depth4, zIndex: 2, backgroundColor:Colors.tint30, display:'flex', flexDirection:'column', width:50}}}>
                                    <NavMenu/>
                                </Stack.Item>
                                <Stack.Item grow={true} verticalFill styles={{root:{display:'flex', boxSizing:'border-box', backgroundColor: Colors.tint50}}}>
                                    <NavRoutes syncTasks={syncTasks} socket={socket}/>
                                </Stack.Item>
                            </Stack>
                        </div>
                    </Router>
                </Customizer>
            </Customizer>
        );
    }
}

export default App;

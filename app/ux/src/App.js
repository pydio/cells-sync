import React from 'react';
import './App.css';
import Sockette from 'sockette'
import SyncTask from './SyncTask'
import {ScrollablePane} from 'office-ui-fabric-react/lib/ScrollablePane'
import {Sticky, StickyPositionType} from 'office-ui-fabric-react/lib/Sticky'
import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import {Link} from 'office-ui-fabric-react/lib/Link'
import { SharedColors } from '@uifabric/fluent-theme/lib/fluent/FluentColors';
import { FontSizes } from '@uifabric/fluent-theme/lib/fluent/FluentType';
import { Customizer } from 'office-ui-fabric-react';
import { FluentCustomizations } from '@uifabric/fluent-theme';
import { CompoundButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button';
import { Panel, PanelType } from 'office-ui-fabric-react/lib/Panel';
import { initializeIcons } from '@uifabric/icons';
import Editor from "./Editor";
initializeIcons();

class App extends React.Component{

    constructor(props){
        super(props);
        this.startWs();
        this.state = {
            connected: false,
            syncTasks: {},
            showPanel: false
        }
    }

    read(msg){
        const d = JSON.parse(msg.data);
        if (d) {
            return d
        } else {
            return {Type:'ERROR', Content:'Cannot decode ' + msg.data}
        }
    }

    startWs() {
        this.ws = new Sockette('ws://localhost:3636/status', {
            timeout: 5e3,
            maxAttempts: 20,
            onopen: (e) => this.onOpen(e),
            onmessage: e => this.onMessage(e),
            onreconnect: e => this.onReconnect(e),
            onmaximum: e => this.onMaximum(e),
            onclose: e => this.onClose(e),
            onerror: e => this.onError(e)
        });
    }

    onOpen(msg){
        this.ws.json({Type:'PING'});
        this.setState({connected: true})
    }

    onReconnect(msg){

    }

    onMaximum(msg){

    }

    onClose(msg){
        this.setState({connected: false})
    }

    onError(msg){
        this.setState({connected: false})
    }

    onMessage(msg) {
        const data = this.read(msg);
        if (data.Type === 'PONG'){
            console.log('Correctly connected!', data)
        }  else if(data.Type === 'STATUS'){
            this.setState({lastStatus: data.Content})
        } else if(data.Type === 'STATE'){
            const {syncTasks} = this.state;
            const {UUID} = data.Content;
            syncTasks[UUID] = data.Content;
            this.setState({syncTasks});
        } else {
            console.log(data)
        }
    }

    sendMessage(type, content) {
        this.ws.json({Type: type, Content: content});
    }

    render(){
        const {connected, syncTasks, showPanel} = this.state;
        return (
            <Customizer {...FluentCustomizations}>
                <ScrollablePane>
                    <Dialog
                        hidden={connected}
                        onDismiss={this._closeDialog}
                        dialogContentProps={{
                            type: DialogType.normal,
                            title: 'Disconnected',
                            subText: 'Application is disconnected from agent. Please wait while we are trying to reconnect...'
                        }}
                        modalProps={{
                            isBlocking: true,
                            styles: { main: { maxWidth: 450 } },
                        }}
                    >
                        <DialogFooter>
                            <PrimaryButton onClick={() => {this.ws.reconnect()}} text="Reconnect Now" />
                        </DialogFooter>
                    </Dialog>

                    <Panel
                        isOpen={showPanel}
                        type={PanelType.smallFluid}
                        onDismiss={()=>{this.setState({showPanel: false})}}
                        headerText="Create a new Sync Task"
                    >
                        <Editor/>
                    </Panel>

                    <div>
                        <Sticky stickyPosition={StickyPositionType.Header}>
                            <div style={{backgroundColor:SharedColors.cyanBlue10, color:'white', padding: 20, display:'flex', alignItems:'center'}}>
                                <div style={{flex: 1, fontSize: FontSizes.size42, fontWeight:300}}>Cells Sync</div>
                                <div><Link styles={{root:{color:'white'}}} href={"http://localhost:6060/debug/pprof"} target={"_blank"}>Debugger</Link></div>
                            </div>
                        </Sticky>
                        <div>
                        {Object.keys(syncTasks).map(k => {
                            const task = syncTasks[k];
                            return <SyncTask key={k} state={task} sendMessage={this.sendMessage.bind(this)}/>
                        })}
                        </div>
                        <div style={{padding: 20, textAlign:'center'}}>
                            <CompoundButton
                                iconProps={{iconName:'Add'}}
                                secondaryText={"Setup a new synchronization task"}
                                onClick={()=>{this.setState({showPanel: true})}}>Create Sync</CompoundButton>
                        </div>
                    </div>
                </ScrollablePane>
            </Customizer>
        );
    }
}

export default App;
import React from 'react';
import './App.css';
import Sockette from 'sockette'
import SyncTask from './SyncTask'
import {ScrollablePane} from 'office-ui-fabric-react/lib/ScrollablePane'
import {Sticky, StickyPositionType} from 'office-ui-fabric-react/lib/Sticky'
import { Modal } from 'office-ui-fabric-react/lib/Modal';
import {Link} from 'office-ui-fabric-react/lib/Link'

class App extends React.Component{

    constructor(props){
        super(props);
        this.startWs();
        this.state = {
            connected: false,
            syncTasks: {}
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
        const {connected, syncTasks} = this.state;
        return (
            <ScrollablePane style={{opacity:connected?1:.5}}>
                <Modal
                    titleAriaId={"Client disconnected"}
                    isOpen={!connected}
                    isBlocking={true}
                >
                    <div style={{width: 320}}>
                        <div style={{padding: '0 20px'}}><h2>Disconnected</h2></div>
                        <div style={{padding: '10px 20px 20px'}}>Disconnected from process! Please wait for reconnection...</div>
                    </div>
                </Modal>
                <div>
                    <Sticky stickyPosition={StickyPositionType.Header}>
                        <div style={{backgroundColor:'#e0e0e0', padding: 20, display:'flex', alignItems:'center'}}>
                            <div style={{flex: 1, fontSize: 20}}>All Tasks</div>
                            <div><Link href={"http://localhost:6060/debug/pprof"} target={"_blank"}>Debugger</Link></div>
                        </div>
                    </Sticky>
                    <div>
                    {Object.keys(syncTasks).map(k => {
                        const task = syncTasks[k];
                        return <SyncTask key={k} state={task} sendMessage={this.sendMessage.bind(this)}/>
                    })}
                    </div>
                </div>
            </ScrollablePane>
        );
    }
}

export default App;

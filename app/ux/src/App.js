import React from 'react';
import './App.css';
import Sockette from 'sockette'
import SyncTask from './task/SyncTask'
import {ScrollablePane} from 'office-ui-fabric-react/lib/ScrollablePane'
import {Sticky, StickyPositionType} from 'office-ui-fabric-react/lib/Sticky'
import {Link} from 'office-ui-fabric-react/lib/Link'
import { SharedColors } from '@uifabric/fluent-theme/lib/fluent/FluentColors';
import { FontSizes } from '@uifabric/fluent-theme/lib/fluent/FluentType';
import { Customizer } from 'office-ui-fabric-react';
import { FluentCustomizations } from '@uifabric/fluent-theme';
import { CompoundButton } from 'office-ui-fabric-react/lib/Button';
import { Panel, PanelType } from 'office-ui-fabric-react/lib/Panel';
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import { initializeIcons } from '@uifabric/icons';
import Editor from "./task/Editor";
import { Translation } from 'react-i18next';
import AgentModal from './dashboard/AgentModal'
import { BrowserRouter as Router, Route, Redirect} from 'react-router-dom'

initializeIcons();

class App extends React.Component{

    constructor(props){
        super(props);
        this.startWs();
        this.state = {
            connected: false,
            maxAttemptsReached: false,
            syncTasks: {},
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
            timeout: 3e3,
            maxAttempts: 60,
            onopen: (e) => this.onOpen(e),
            onmessage: e => this.onMessage(e),
            onreconnect: e => this.onReconnect(e),
            onmaximum: e => this.onMaximum(e),
            onclose: e => this.onClose(e),
            onerror: e => this.onError(e)
        });
    }

    forceReconnect() {
        const {maxAttemptsReached} = this.state;
        if (this.ws && !maxAttemptsReached) {
            this.ws.reconnect();
        } else {
            this.startWs();
        }
    }

    onOpen(msg){
        this.ws.json({Type:'PING'});
        this.setState({
            connected: true,
            maxAttemtpsReached: false,
            connecting: false,
        })
    }

    onReconnect(msg){
        this.setState({connecting: true})
    }

    onMaximum(msg){
        this.setState({maxAttemptsReached: true});
    }

    onClose(msg){
        this.setState({connected: false, connecting: false})
    }

    onError(msg){
        this.setState({connected: false, connecting: false})
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

    onDelete(config) {
        this.sendMessage('CONFIG', {Cmd:'delete', Config:config});
        const {syncTasks} = this.state;
        if(syncTasks[config.Uuid]) {
            delete(syncTasks[config.Uuid]);
            this.setState({syncTasks});
            // Reload tasks to be sure
            window.setTimeout(()=>{
                this.ws.json({type:'PING'});
            }, 1000);
        }
    }

    render(){
        const {connected, connecting, maxAttemptsReached, syncTasks} = this.state;
        return (
            <Customizer {...FluentCustomizations}>
                <Translation>{(t, {i18n}) =>
                    <Router>
                        <Route render={({history, location}) =>
                            <ScrollablePane styles={{root:{backgroundColor:'#fafafa'}}}>
                                <AgentModal
                                    hidden={connected}
                                    reconnect={this.forceReconnect.bind(this)}
                                    connecting={connecting}
                                    maxAttemptsReached={maxAttemptsReached}
                                />
                                <Panel
                                    isOpen={location.pathname.indexOf('/create') === 0 || location.pathname.indexOf('/edit') === 0}
                                    type={PanelType.smallFluid}
                                    onDismiss={()=>{history.push('/')}}
                                    headerText={location.pathname.indexOf('/create') === 0 ? t('editor.title.new') : t('editor.title.update')}
                                >
                                    <Route path={"/create"} render={({history}) =>
                                        <Editor
                                            task={true}
                                            onDismiss={()=>{history.push('/')}}
                                            sendMessage={this.sendMessage.bind(this)}
                                        />
                                    }/>
                                    <Route path={"/edit/:uuid"} render={({match, history}) =>
                                        syncTasks[match.params['uuid']] ?
                                        <Editor
                                            task={syncTasks[match.params['uuid']]}
                                            onDismiss={()=>{history.push('/')}}
                                            sendMessage={this.sendMessage.bind(this)}
                                        /> :
                                        <Redirect to={"/"}/>
                                    }/>
                                </Panel>

                                <div>
                                    <Sticky stickyPosition={StickyPositionType.Header}>
                                        <div style={{backgroundColor:SharedColors.cyanBlue10, boxShadow:Depths.depth8, color:'white', padding: 20, display:'flex', alignItems:'center'}}>
                                            <div style={{flex: 1, fontSize: FontSizes.size20, fontWeight:400}}>{t('application.title')}</div>
                                            <div>
                                                <Link styles={{root:{color:'white'}}} href={"http://localhost:6060/debug/pprof"} target={"_blank"}>Debugger</Link>
                                            </div>
                                        </div>
                                    </Sticky>
                                    <div>
                                        {Object.keys(syncTasks).map(k => {
                                            const task = syncTasks[k];
                                            return <SyncTask
                                                key={k}
                                                state={task}
                                                sendMessage={this.sendMessage.bind(this)}
                                                openEditor={()=>{history.push('/edit/' + task.Config.Uuid)}}
                                                onDelete={this.onDelete.bind(this)}
                                            />
                                        })}
                                    </div>
                                    <div style={{padding: 20, textAlign:'center'}}>
                                        <CompoundButton
                                            iconProps={{iconName:'Add'}}
                                            secondaryText={t('main.create.legend')}
                                            onClick={()=>{history.push('/create')}}>{t('main.create')}</CompoundButton>
                                    </div>
                                </div>
                            </ScrollablePane>
                        }>
                        </Route>
                    </Router>
                }</Translation>
            </Customizer>
        );
    }
}

export default App;

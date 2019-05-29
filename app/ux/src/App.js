import React from 'react';
// FABRIC UI
import {Customizer, Link, Sticky, StickyPositionType, ScrollablePane, Panel, PanelType } from 'office-ui-fabric-react';
import {Depths, FluentCustomizations, FontSizes, SharedColors} from '@uifabric/fluent-theme';
import { initializeIcons } from '@uifabric/icons';
// CONNECTION AND ROUTING
import Sockette from 'sockette'
import { Translation } from 'react-i18next';
import { BrowserRouter as Router, Route, Redirect} from 'react-router-dom'
// SYNC COMPONENTS
import Editor from "./task/Editor";
import AgentModal from './dashboard/AgentModal'
import TasksList from "./task/TasksList";

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
                                <Sticky stickyPosition={StickyPositionType.Header}>
                                    <div style={{
                                        backgroundColor: SharedColors.cyanBlue10,
                                        boxShadow: Depths.depth8,
                                        color: 'white',
                                        padding: 20,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{
                                            flex: 1,
                                            fontSize: FontSizes.size20,
                                            fontWeight: 400
                                        }}>{t('application.title')}</div>
                                        <div style={{color: 'white'}}>
                                            <Link styles={{root: {color: 'white'}}} href={"http://localhost:6060/debug/pprof"} target={"_blank"}>Debugger</Link>
                                            &nbsp;|&nbsp;<Link styles={{root: {color: 'white'}}} onClick={()=>{i18n.changeLanguage('en')}}>EN</Link>
                                            &nbsp;|&nbsp;<Link styles={{root: {color: 'white'}}} onClick={()=>{i18n.changeLanguage('fr')}}>FR</Link>
                                        </div>
                                    </div>
                                </Sticky>
                                <TasksList syncTasks={syncTasks} sendMessage={this.sendMessage.bind(this)} onDelete={this.onDelete.bind(this)}/>

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

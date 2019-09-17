import React, {Component} from 'react'
import Storage from './Storage'
import {Page} from "../components/Page";
import {Depths} from "@uifabric/fluent-theme";
import {withTranslation} from "react-i18next";
import { TextField, PrimaryButton, DefaultButton, Stack, IconButton } from 'office-ui-fabric-react';

class Servers extends Component{

    constructor(props) {
        super(props);
        this.state = {
            servers:[],
            newUrl: ''
        };
    }

    componentDidMount(){
        const {socket} = this.props;
        this._listener = (auths) => {
            this.setState({servers: auths || []});
        };
        socket.listenAuthorities(this._listener);
        Storage.getInstance(socket).listServers();
    }

    componentWillUnmount(){
        const {socket} = this.props;
        socket.stopListeningAuthorities(this._listener)

    }

    deleteServer(url){
        if(window.confirm('Are you sure?')){
            Storage.getInstance(this.props.socket).deleteServer(url);
        }
    }

    refreshLogin(serverUrl){
        const manager = Storage.newManager(serverUrl);
        manager.signinRedirect();
    }

    loginToNewServer(){
        const {newUrl} = this.state;
        const manager = Storage.newManager(newUrl);
        manager.signinRedirect();
    }

    render() {
        const {servers, newUrl, addMode} = this.state;
        const {t} = this.props;
        const action = {
            key:'create',
            text:t('server.create'),
            title:t('server.create.legend'),
            primary:true,
            iconProps:{iconName:'Add'},
            onClick:()=>{this.setState({addMode: true})},
        };
        return (
            <Page title={"Servers"} legend={"Servers List & OAuth management"} barItems={[action]}>
                {addMode &&
                    <Stack horizontal tokens={{childrenGap: 8}} style={{margin:10, padding: '0 10px', boxShadow: Depths.depth4, backgroundColor:'white', display:'flex', alignItems: 'center'}}>
                        <Stack.Item><h3>Add Server</h3></Stack.Item>
                        <Stack.Item grow><TextField styles={{root:{flex: 1}}} type={"text"} value={newUrl} onChange={(e, v) => {this.setState({newUrl: v})}}/></Stack.Item>
                        <Stack.Item><PrimaryButton onClick={this.loginToNewServer.bind(this)} text={"Login"}/></Stack.Item>
                        <Stack.Item><DefaultButton onClick={()=>{this.setState({addMode: false})}} text={"Cancel"}/></Stack.Item>
                    </Stack>
                }
                {servers.map(s =>
                    <div key={s.uri} style={{margin:10, boxShadow: Depths.depth4, backgroundColor:'white', padding: 10}}>
                        <h3>{s.uri}</h3>
                        <div>{JSON.stringify(s)}</div>
                        <div>
                            <IconButton iconProps={{iconName:'Delete'}} onClick={()=>{this.deleteServer(s.uri)}}/>
                            <IconButton iconProps={{iconName:'Refresh'}} onClick={()=>{this.refreshLogin(s.uri)}}/>
                        </div>
                    </div>
                )}
            </Page>

        );
    }

}

Servers = withTranslation()(Servers);

export default Servers;
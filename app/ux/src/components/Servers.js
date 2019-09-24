import React, {Component} from 'react'
import Storage from '../oidc/Storage'
import {Page} from "./Page";
import {Depths} from "@uifabric/fluent-theme";
import {withTranslation} from "react-i18next";
import {
    TextField,
    PrimaryButton,
    DefaultButton,
    Stack,
    IconButton,
    TooltipDelay,
    TooltipHost
} from 'office-ui-fabric-react';
import moment from 'moment'
/*
const sampleServer = {
    uri:"http://local.pydio:8080",
    serverLabel:"Pydio Cells",
    username:"admin",
    loginDate:"2019-09-18T15:54:59.328434+02:00",
    refreshDate:"0001-01-01T00:00:00Z",
    tokenStatus:"",
    expires_at:1568818498
};
const emptyDate = '0001-01-01T00:00:00Z';
*/

const styles = {
    serverCont: {display:'flex', flexWrap:'wrap', padding: 5},
    server: {
        textAlign: 'center',
        margin:5,
        boxShadow: Depths.depth4,
        backgroundColor:'white',
        padding: '10px 20px',
        minWidth: 200,
        flex: 1,
        display:'flex',
        flexDirection:'column'
    },
    serverActions:{
        marginTop: 40,
        marginBottom: 10,
    },
    buttons: {
        root:{borderRadius: '50%', width: 48, height: 48, backgroundColor: '#F5F5F5', padding: '0 8px;', margin: '0 5px'},
        icon:{fontSize: 24},
        menuIcon:{display:'none'}
    }
};


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
            this.setState({servers: auths || [], addMode: false, newUrl: ''});
        };
        socket.listenAuthorities(this._listener);
        Storage.getInstance(socket).listServers();
    }

    componentWillUnmount(){
        const {socket} = this.props;
        socket.stopListeningAuthorities(this._listener)

    }

    deleteServer(id){
        const {t} = this.props;
        if(window.confirm(t('task.action.delete.confirm'))){
            Storage.getInstance(this.props.socket).deleteServer(id);
        }
    }

    refreshLogin(serverUrl){
        Storage.signin(serverUrl);
    }

    loginToNewServer(){
        const {newUrl} = this.state;
        Storage.signin(newUrl);
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
            <Page title={t("nav.servers")} barItems={[action]}>
                {addMode &&
                    <Stack horizontal tokens={{childrenGap: 8}} style={{margin:10, padding: '0 10px', boxShadow: Depths.depth4, backgroundColor:'white', display:'flex', alignItems: 'center'}}>
                        <Stack.Item><h3>{t('server.create')}</h3></Stack.Item>
                        <Stack.Item grow><TextField styles={{root:{flex: 1}}} placeholder={t('server.url.placeholder')} type={"text"} value={newUrl} onChange={(e, v) => {this.setState({newUrl: v})}}/></Stack.Item>
                        <Stack.Item><PrimaryButton onClick={this.loginToNewServer.bind(this)} text={t('server.login.button')}/></Stack.Item>
                        <Stack.Item><DefaultButton onClick={()=>{this.setState({addMode: false})}} text={t('button.cancel')}/></Stack.Item>
                    </Stack>
                }
                <div style={styles.serverCont}>
                {servers.map(s =>
                    <div key={s.id} style={styles.server}>
                        <h2 style={{color:'#607D8B'}}>{s.serverLabel}</h2>
                        <div style={{flex: '1 1 auto'}}>
                            <h4 style={{margin:'10px 0'}}>{s.uri}</h4>
                            <div style={{lineHeight:'1.5em'}}>
                                {t('server.info.description').replace('%1', s.username).replace('%2', moment(new Date(s.loginDate)).fromNow())}.<br/>
                                {s.tasksCount > 0 ? ( s.tasksCount === 1 ? t('server.tasksCount.one') : t('server.tasksCount.plural').replace('%s', s.tasksCount)) : t('server.tasksCount.zero')}
                            </div>
                        </div>
                        <div style={styles.serverActions}>
                            <TooltipHost id={"button-refresh"} key={"button-refresh"} content={t('server.refresh.button')} delay={TooltipDelay.zero}>
                                <IconButton iconProps={{iconName:'Refresh'}} onClick={()=>{this.refreshLogin(s.uri)}} styles={styles.buttons}/>
                            </TooltipHost>
                            <TooltipHost id={"button-delete"} key={"button-delete"} content={t('server.delete.button')} delay={TooltipDelay.zero}>
                                <IconButton iconProps={{iconName:'Delete'}} onClick={()=>{this.deleteServer(s.id)}} styles={styles.buttons} disabled={s.tasksCount > 0}/>
                            </TooltipHost>
                        </div>
                    </div>
                )}
                </div>
            </Page>

        );
    }

}

Servers = withTranslation()(Servers);

export default Servers;
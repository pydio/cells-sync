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
    TooltipHost, CompoundButton, DirectionalHint, Icon
} from 'office-ui-fabric-react';
import moment from 'moment'
import parse from "url-parse";
import {withRouter} from 'react-router-dom'

/*
const sampleServer = {
    uri:"http://local.pydio:8080",
    serverLabel:"Pydio Cells",
    username:"admin",
    loginDate:"2019-09-18T15:54:59.328434+02:00",
    refreshDate:"0001-01-01T00:00:00Z",
    refreshStatus:{valid:false, error:"errorString"},
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
    serverLabel: {
        color:'#607D8B',
        display:'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    errorIcon: {
        color: '#d32f2f',
        padding: '0 10px',
        cursor: 'pointer'
    },
    serverActions:{
        marginTop: 40,
        marginBottom: 10,
    },
    buttons: {
        root:{borderRadius: '50%', width: 48, height: 48, backgroundColor: '#F5F5F5', padding: '0 8px;', margin: '0 5px'},
        rootDisabled:{backgroundColor:'#fafafa'},
        icon:{fontSize: 24, height: 24},
        menuIcon:{display:'none'}
    },
    bigButtonContainer: {
        position: 'absolute',
        display: 'flex',
        height: '90%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    }
};


class AccountsList extends Component{

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

    deleteServer(s){
        const {t} = this.props;
        if (s.tasksCount > 0) {
            window.alert(t('server.delete.action.cannot'));
            return
        }
        if(window.confirm(t('server.delete.action.confirm'))){
            Storage.getInstance(this.props.socket).deleteServer(s.id);
        }
    }

    createSyncTask(id){
        const {history} = this.props;
        history.push('/create?id=' + id);
    }

    refreshLogin(serverUrl){
        Storage.signin(serverUrl);
    }

    loginToNewServer(){
        const {newUrl} = this.state;
        // Remove path part
        const ll = parse(newUrl, {}, true);
        ll.pathname = "";
        Storage.signin(ll.toString());
    }

    render() {
        const {servers, newUrl, addMode} = this.state;
        const {t} = this.props;
        let loginButtonDisabled = true;
        const ll = parse(newUrl, {}, true);
        if(ll.protocol.indexOf("http") === 0 && ll.host) {
            loginButtonDisabled = false;
        }

        const action = {
            key:'create',
            text:t('server.create'),
            title:t('server.create.legend'),
            primary:true,
            iconProps:{iconName:'CloudAdd'},
            onClick:()=>{this.setState({addMode: true})},
        };
        let content;
        if(!addMode && servers && servers.length === 0) {
            content = (
                <div style={styles.bigButtonContainer}>
                    <CompoundButton
                        primary={true}
                        iconProps={{iconName: 'AddFriend'}}
                        secondaryText={t('server.create.legend')}
                        onClick={() => {this.setState({addMode: true})}}
                    >{t('server.create')}</CompoundButton>
                </div>
            );
        } else {
            content = (
                <div style={styles.serverCont}>
                    {servers.map(s =>
                        <div key={s.id} style={styles.server}>
                            <h2 style={styles.serverLabel}>
                                {s.refreshStatus && s.refreshStatus.valid === false &&
                                <TooltipHost
                                    styles={{root:{height: 22}}}
                                    id={s.id}
                                    directionalHint={DirectionalHint.bottomCenter}
                                    content={<span style={{color: styles.errorIcon.color}}>{s.refreshStatus.error}</span>}
                                >
                                    <Icon aria-labelledby={s.id} iconName={"Warning"} styles={{root: styles.errorIcon}}/>
                                </TooltipHost>
                                }
                                {s.serverLabel}
                            </h2>
                            <div style={{flex: '1 1 auto'}}>
                                <h4 style={{margin:'10px 0'}}>{s.uri}</h4>
                                <div style={{lineHeight:'1.5em'}}>
                                    {t('server.info.description').replace('%1', s.username).replace('%2', moment(new Date(s.loginDate)).fromNow())}.<br/>
                                    {s.tasksCount > 0 ? ( s.tasksCount === 1 ? t('server.tasksCount.one') : t('server.tasksCount.plural').replace('%', s.tasksCount)) : t('server.tasksCount.zero')}
                                </div>
                            </div>
                            <div style={styles.serverActions}>
                                <TooltipHost id={"button-refresh"} key={"button-refresh"} content={t('server.refresh.button')} delay={TooltipDelay.zero}>
                                    <IconButton iconProps={{iconName:'UserSync'}} onClick={()=>{this.refreshLogin(s.uri)}} styles={styles.buttons}/>
                                </TooltipHost>
                                <TooltipHost id={"button-add"} key={"button-add"} content={t('server.add-task.button')} delay={TooltipDelay.zero}>
                                    <IconButton iconProps={{iconName:'SyncFolder'}} onClick={()=>{this.createSyncTask(s.id)}} styles={styles.buttons} disabled={s.refreshStatus && s.refreshStatus.valid === false}/>
                                </TooltipHost>
                                <TooltipHost id={"button-delete"} key={"button-delete"} content={t('server.delete.button')} delay={TooltipDelay.zero}>
                                    <IconButton iconProps={{iconName:'Delete'}} onClick={()=>{this.deleteServer(s)}} styles={styles.buttons} disabled={s.tasksCount > 0}/>
                                </TooltipHost>
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        return (
            <Page title={t("nav.servers")} barItems={[action]}>
                {addMode &&
                    <Stack horizontal tokens={{childrenGap: 8}} style={{margin:10, padding: '0 10px', boxShadow: Depths.depth4, backgroundColor:'white', display:'flex', alignItems: 'center'}}>
                        <Stack.Item><h3>{t('server.create')}</h3></Stack.Item>
                        <Stack.Item grow><TextField autoFocus={true} styles={{root:{flex: 1}}} placeholder={t('server.url.placeholder')} type={"text"} value={newUrl} onChange={(e, v) => {this.setState({newUrl: v})}}/></Stack.Item>
                        <Stack.Item><PrimaryButton onClick={this.loginToNewServer.bind(this)} text={t('server.login.button')} disabled={loginButtonDisabled}/></Stack.Item>
                        <Stack.Item><DefaultButton onClick={()=>{this.setState({addMode: false})}} text={t('button.cancel')}/></Stack.Item>
                    </Stack>
                }
                {content}
            </Page>

        );
    }

}

AccountsList = withRouter(AccountsList);
AccountsList = withTranslation()(AccountsList);

export default AccountsList;
import { UserManager } from 'oidc-client';

const userManagerConfig = {
    //authority: 'http://CELLS_SERVER/oidc',
    client_id: 'cells-sync',
    redirect_uri: 'http://localhost:' + window.location.port + '/servers/callback',
    response_type: 'code',
    scope: 'openid email profile pydio offline',
    loadUserInfo: false,
    automaticSilentRenew: false,
};

class Storage
{
    constructor(socket){
        this.socket = socket;
    }

    static getInstance(socket){
        if (!Storage.__INSTANCE){
            Storage.__INSTANCE = new Storage(socket);
        }
        return Storage.__INSTANCE;
    }

    static newManager(url, currentEditState = undefined){
        const newConfig = {
            ...userManagerConfig,
            authority:url.replace(new RegExp("[/]+$"), "") + '/oidc',
            serverUrl: url
        };
        localStorage.setItem("oidc.new", JSON.stringify(newConfig));
        if(currentEditState){
            localStorage.setItem("edit.state", JSON.stringify(currentEditState));
        }
        return new UserManager(newConfig);
    }

    static getCurrentConfig(){
        if(localStorage.getItem("oidc.new")){
            return JSON.parse(localStorage.getItem("oidc.new"));
        } else {
            return null;
        }
    }

    static getManagerForCurrent() {
        const config = Storage.getCurrentConfig();
        if(config){
            return new UserManager(config);
        } else {
            return null;
        }
    }

    static getLastEditState(){
        const s = localStorage.getItem("edit.state");
        if(s){
            localStorage.removeItem("edit.state");
            return JSON.parse(s)
        }
        return null;
    }

    listServers(){
        this.socket.sendMessage('CONFIG', {Cmd:"list", Authority:{}})
    }

    storeServer(url, status){
        const {id_token, refresh_token, expires_at} = status;
        this.socket.sendMessage('CONFIG', {Cmd:"create", Authority:{uri: url,id_token, refresh_token, expires_at}})
    }

    deleteServer(url){
        this.socket.sendMessage('CONFIG', {cmd:"delete", Authority: {uri: url}})
    }

}


export {Storage as default}
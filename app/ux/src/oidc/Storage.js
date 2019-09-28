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

    static signin(url, currentEditState = undefined){
        // TMP DEBUG
        // window.linkOpener = window;
        const externalOpen = !!window.linkOpener;
        const manager = Storage.newManager(url, currentEditState);
        const href = 'http://localhost:' + window.location.port + '/servers/external?manager=' + encodeURI(url);
        if (externalOpen){
            window.linkOpener.open(href)
        } else {
            manager.signinRedirect();
        }
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
        const {id_token, access_token, refresh_token, expires_at} = status;
        this.socket.sendMessage('CONFIG', {Cmd:"create", Authority:{uri: url, id_token, access_token, refresh_token, expires_at}})
    }

    deleteServer(id){
        this.socket.sendMessage('CONFIG', {cmd:"delete", Authority: {id: id}})
    }

}


export {Storage as default}
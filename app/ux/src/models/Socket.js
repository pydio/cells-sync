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
import Sockette from "sockette";

export default class Socket {

    constructor(onStatus, onTasks) {
        this.onStatus = onStatus;
        this.onTasks = onTasks;
        this.onUpdate = [];

        this.state = {
            syncTasks: {},
            connected: false,
            connecting: true,
            maxAttemptsReached: false
        }
    }

    setState(data) {
        this.state = {...this.state, ...data};
        if(this.onStatus) {
            this.onStatus(this.state);
        }
        if(data.syncTasks && this.onTasks) {
            this.onTasks(this.state.syncTasks)
        }
    }

    listenUpdates(callback){
        this.onUpdate.push(callback);
    }

    stopListeningUpdates(callback){
        this.onUpdate = this.onUpdate.filter(cb => cb !== callback);
    }

    read(msg){
        const d = JSON.parse(msg.data);
        if (d) {
            return d
        } else {
            return {Type:'ERROR', Content:'Cannot decode ' + msg.data}
        }
    }

    start() {
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
            this.start();
        }
    }

    onOpen(msg){
        this.triggerTasksStatus();
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
        } else if(data.Type === 'STATE') {
            const {syncTasks} = this.state;
            const {UUID, Status} = data.Content;
            if (Status === 7 && syncTasks[UUID]) {
                delete(syncTasks[UUID]);
            } else {
                syncTasks[UUID] = data.Content;
            }
            this.setState({syncTasks});
        } else if(data.Type === 'UPDATE') {
            this.onUpdate.forEach(cb => {
                cb(data.Content);
            })
        } else {
            console.log(data)
        }
    }

    sendMessage(type, content = '', retry = 1) {
        if(this.state.connected){
            this.ws.json({Type: type, Content: content});
        } else if(retry < 10){
            console.warn('websocket not connected yet, retry in 0.5 seconds');
            setTimeout(()=>{
                this.sendMessage(type, content, retry + 1)
            }, 50 * retry)
        } else {
            console.error('websocket not connected yet, cannot send message!');
        }
    }

    triggerTasksStatus() {
        this.sendMessage('PING')
    }

    deleteTask(config) {
        this.sendMessage('CONFIG', {Cmd:'delete', Config:config});
    }

}
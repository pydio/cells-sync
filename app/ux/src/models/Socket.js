import Sockette from "sockette";

export default class Socket {

    constructor(onStatus, onTasks) {
        this.onStatus = onStatus;
        this.onTasks = onTasks;

        this.state = {
            syncTasks: {},
            connected: false,
            connecting: false,
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
        } else if(data.Type === 'STATE'){
            const {syncTasks} = this.state;
            const {UUID, Status} = data.Content;
            if (Status === 7 && syncTasks[UUID]){
                delete(syncTasks[UUID]);
            } else {
                syncTasks[UUID] = data.Content;
            }
            this.setState({syncTasks});
        } else {
            console.log(data)
        }
    }

    sendMessage(type, content = '') {
        this.ws.json({Type: type, Content: content});
    }

    triggerTasksStatus() {
        this.sendMessage('PING')
    }

    deleteTask(config) {
        this.sendMessage('CONFIG', {Cmd:'delete', Config:config});
        /*
        const {syncTasks} = this.state;
        if(syncTasks[config.Uuid]) {
            delete(syncTasks[config.Uuid]);
            this.setState({syncTasks});
            // Reload tasks to be sure
            window.setTimeout(()=>{
                this.triggerTasksStatus({type:'PING'});
            }, 1000);
        }
        */
    }

}
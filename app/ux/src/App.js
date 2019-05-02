import React from 'react';
import logo from './logo.svg';
import './App.css';
import Sockette from 'sockette'

class App extends React.Component{

    constructor(props){
        super(props);
        this.startWs();
        this.state = {
            connected: false,
            lastStatus: null,
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
        } else {
            console.log(data)
        }
    }

    render(){
        const {connected, lastStatus} = this.state;

        return (
            <div className="App">
                <header className="App-header" style={{opacity:connected?1:0.5}}>
                    <img src={logo} className="App-logo" alt="logo" />
                    {lastStatus &&
                        <p>
                            {lastStatus.StatusString} : {lastStatus.Progress ? Math.ceil(lastStatus.Progress * 100)+'%':''}
                        </p>
                    }
                </header>
            </div>
        );

    }
}

export default App;

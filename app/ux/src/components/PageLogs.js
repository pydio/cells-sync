import React from 'react'
import Page from "./Page";
import Sockette from "sockette";
import AnsiUp from 'ansi_up'

class PageLogs extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            connected: false,
            connecting: false,
            maxAttemptsReached: false,
            lines:[],
        }
    }

    componentDidMount(){
        this.start()
    }

    componentWillUnmount(){
        if (this.ws !== null){
            this.ws.close();
        }
    }

    start() {
        this.ws = new Sockette('ws://localhost:3636/logs', {
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
        const {lines} = this.state;
        let line = msg.data;
        const newLines = [...lines, line];
        this.setState({lines: newLines}, ()=>{
            if(this.refs && this.refs.block){
                this.refs.block.scrollTo(0, 10000);
            }
        });
    }


    render() {
        const converter = new AnsiUp();
        const {lines} = this.state;
        const preStyle = {
            backgroundColor:'black',
            color: 'white',
            height: "100%",
            width:"100%",
            overflow:'auto',
            fontSize:11,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            whiteSpace: 'pre',
            lineHeight: '1.3em'
        };
        return (
            <Page title={"Logs"} legend={"Application logs"} flex={true}>
                <div ref={"block"} style={preStyle}>
                    {lines.map((line, k) => {
                        return (<div key={k} dangerouslySetInnerHTML={{__html:converter.ansi_to_html(line)}}/>)
                    })}
                </div>
            </Page>
        );
    }
}

export default PageLogs
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
import React from 'react'
import {Page} from "./Page";
import Sockette from "sockette";
import AnsiUp from 'ansi_up'
import {List} from 'office-ui-fabric-react'
import {withTranslation} from "react-i18next";

class PageLogs extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            connected: false,
            connecting: false,
            maxAttemptsReached: false,
            lines:[],
        };
        this.converter = new AnsiUp();
    }

    componentDidMount(){
        this.start()
    }

    componentWillUnmount(){
        this.stopping = true;
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

    onOpen(msg){
        if(this.stopping){
            return;
        }
        this.setState({
            connected: true,
            maxAttemtpsReached: false,
            connecting: false,
        })
    }

    onReconnect(msg){
        if(this.stopping){
            return;
        }
        this.setState({connecting: true})
    }

    onMaximum(msg){
        if(this.stopping){
            return;
        }
        this.setState({maxAttemptsReached: true});
    }

    onClose(msg){
        if(this.stopping){
            return;
        }
        this.setState({connected: false, connecting: false})
    }

    onError(msg){
        if(this.stopping){
            return;
        }
        this.setState({connected: false, connecting: false})
    }

    onMessage(msg) {
        if(this.stopping){
            return;
        }
        const {lines} = this.state;
        let line = msg.data;
        const newLines = [...lines, line];
        this.setState({lines: newLines}, ()=>{
            if(this.refs && this.refs.block){
                this.refs.block.scrollTop += 1000;
            }
        });
    }

    _onRenderCell(line){
        return (<div dangerouslySetInnerHTML={{__html:this.converter.ansi_to_html(line)}}/>)
    }

    render() {
        const {t} = this.props;
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
            <Page title={t('nav.logs')} flex={true}>
                <div ref={"block"} style={preStyle}>
                    <List items={lines} onRenderCell={this._onRenderCell.bind(this)} />
                </div>
            </Page>
        );
    }
}

export default withTranslation()(PageLogs)
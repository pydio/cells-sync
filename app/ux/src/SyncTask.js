import React from 'react'
import {ProgressIndicator} from "office-ui-fabric-react/lib/ProgressIndicator";
import {DefaultButton} from "office-ui-fabric-react/lib/Button"
import {Label} from "office-ui-fabric-react/lib/Label"
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import moment from 'moment'

const StateSample = {
    UUID:"e7c1cf0e-ff87-44f3-b445-bafcfcad6c0d",
    Config:{
        Uuid:"e7c1cf0e-ff87-44f3-b445-bafcfcad6c0d",
        LeftURI:"router:///personal/admin/folder1",
        RightURI:"fs:///Users/charles/Pydio/folder",
        Direction:"Bi"
    },
    Connected:true,
    Status:0,
    LastConnection:"2019-05-03T11:54:37.772312+02:00",
    LastSyncTime:"2019-05-03T11:54:40.775684+02:00",
    LastProcessStatus:{
        IsError:false,
        StatusString:"Task Idle",
        Progress:0
    },
    LeftInfo:null,
    RightInfo:null
};


class SyncTask extends React.Component {


    render() {

        const {state, sendMessage} = this.props;
        const {LastProcessStatus} = state;
        let pg;
        if (LastProcessStatus && LastProcessStatus.Progress) {
            pg = LastProcessStatus.Progress;
        }
        return (
            <div style={{margin:10, padding: 10, boxShadow: Depths.depth8}}>
                <div>
                    <div>
                        <Label>Connected</Label>
                        {state.Connected ? 'OK' : 'NO! Last connection was ' + state.LastConnection}
                    </div>
                    <div>
                        <Label>Last Sync</Label>
                        {moment(state.LastSyncTime).fromNow()}
                    </div>
                    <div>
                        <Label>Status</Label>
                        {LastProcessStatus && <div>{LastProcessStatus.StatusString}</div>}
                        {pg && <div><ProgressIndicator title={"Progress"} description={LastProcessStatus.StatusString} percentComplete={pg}/></div>}
                    </div>
                    <div>
                        <Label>Config</Label>
                        Sync between {state.Config.LeftURI} &lt;=&gt; {state.Config.RightURI}
                    </div>
                </div>
                <div style={{textAlign:'right'}}>

                    <DefaultButton
                        data-automation-id="test"
                        allowDisabledFocus={true}
                        disabled={false}
                        checked={false}
                        text="Loop"
                        onClick={() => sendMessage('CMD', {UUID:state.UUID, Cmd:'loop'})}
                    />
                    &nbsp;
                    &nbsp;
                    <DefaultButton
                        data-automation-id="test"
                        allowDisabledFocus={true}
                        disabled={false}
                        checked={false}
                        text="Resync"
                        onClick={() => sendMessage('CMD', {UUID:state.UUID, Cmd:'resync'})}
                    />

                </div>
            </div>
        );

    }

}

export {SyncTask as default}
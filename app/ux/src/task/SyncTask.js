import React from 'react'
import {ProgressIndicator} from "office-ui-fabric-react/lib/ProgressIndicator";
import {DefaultButton} from "office-ui-fabric-react/lib/Button"
import {Label} from "office-ui-fabric-react/lib/Label"
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import {Stack} from "office-ui-fabric-react/lib/Stack"
import {ContextualMenu} from "office-ui-fabric-react/lib/ContextualMenu"
import moment from 'moment'

class SyncTask extends React.Component {

    static menuAs(menuProps){
        // Customize contextual menu with menuAs
        return <ContextualMenu {...menuProps} />;
    };


    render() {

        const {state, sendMessage, openEditor, onDelete} = this.props;
        const {LastProcessStatus, Status} = state;
        let pg;
        if (LastProcessStatus && LastProcessStatus.Progress) {
            pg = LastProcessStatus.Progress;
        }
        const paused = Status === 1;
        const disabled = !(state.LeftInfo.Connected && state.RightInfo.Connected);
        return (
            <Stack styles={{root:{margin:10, boxShadow: Depths.depth4, backgroundColor:'white'}}} vertical tokens={{childrenGap: 20}}>
                {!state.LeftInfo.Connected &&
                    <div style={{backgroundColor:'#fde7e9', padding: '10px'}}>{'Not Connected to LEFT! Last connection was ' + state.LeftInfo.LastConnection}</div>
                }
                {!state.RightInfo.Connected &&
                    <div style={{backgroundColor:'#fde7e9', padding: '10px'}}>{'Not Connected to RIGHT! Last connection was ' + state.RightInfo.LastConnection}</div>
                }
                <div style={{padding: '10px 20px'}}>
                    <h3>{state.Config.Label} {paused ? ' (paused)' : ''}</h3>
                    <div>
                        <Label>Status</Label>
                        {LastProcessStatus && <div>{LastProcessStatus.StatusString}</div>}
                        {pg && <div><ProgressIndicator title={"Progress"} description={LastProcessStatus.StatusString} percentComplete={pg}/></div>}
                    </div>
                    <div>
                        <Label>Last Sync</Label>
                        {moment(state.LastSyncTime).fromNow()}
                    </div>
                </div>
                <Stack horizontal horizontalAlign="end" tokens={{childrenGap:8}} styles={{root:{padding: 10}}}>
                    <DefaultButton
                        data-automation-id="loop"
                        allowDisabledFocus={true}
                        disabled={disabled}
                        checked={false}
                        text="Sync Now"
                        iconProps={{iconName:'Play'}}
                        onClick={() => sendMessage('CMD', {UUID:state.UUID, Cmd:'loop'})}
                    />
                    <DefaultButton
                        data-automation-id="resync"
                        allowDisabledFocus={true}
                        disabled={disabled}
                        checked={false}
                        text="Full Resync"
                        iconProps={{iconName:'Sync'}}
                        onClick={() => sendMessage('CMD', {UUID:state.UUID, Cmd:'resync'})}
                    />
                    <DefaultButton
                        iconProps={{iconName:'Edit'}}
                        menuAs={SyncTask.menuAs}
                        menuProps={{
                            items:[
                                {
                                    key: 'edit',
                                    text: 'Configure',
                                    iconProps: { iconName: 'Edit' },
                                    onClick:()=>openEditor()
                                },
                                {
                                    key: 'pause',
                                    text: paused ? 'Start' : 'Pause',
                                    iconProps: { iconName: paused ? 'PlayResume' : 'Pause' },
                                    onClick: () => sendMessage('CMD', {UUID:state.UUID, Cmd: paused ? 'resume' : 'pause'})
                                },
                                {
                                    key: 'delete',
                                    text: 'Delete',
                                    iconProps: { iconName: 'Delete' },
                                    onClick: () => {
                                        if (global.confirm('Are you sure?')){
                                            onDelete(state.Config);
                                        }
                                    }
                                }
                            ]
                        }}
                    />
                </Stack>
            </Stack>
        );

    }

}

export {SyncTask as default}
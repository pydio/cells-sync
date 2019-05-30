import React from 'react'
import {ProgressIndicator} from "office-ui-fabric-react/lib/ProgressIndicator";
import {DefaultButton} from "office-ui-fabric-react/lib/Button"
import {Label} from "office-ui-fabric-react/lib/Label"
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import {Stack} from "office-ui-fabric-react/lib/Stack"
import {ContextualMenu} from "office-ui-fabric-react/lib/ContextualMenu"
import moment from 'moment'
import {withTranslation} from 'react-i18next'

class SyncTask extends React.Component {

    static menuAs(menuProps){
        // Customize contextual menu with menuAs
        return <ContextualMenu {...menuProps} />;
    };


    render() {

        const {state, socket, openEditor, t} = this.props;
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
                    <div style={{backgroundColor:'#fde7e9', padding: '10px'}}>{t('task.disconnected') + state.LeftInfo.LastConnection}</div>
                }
                {!state.RightInfo.Connected &&
                    <div style={{backgroundColor:'#fde7e9', padding: '10px'}}>{t('task.disconnected') + state.RightInfo.LastConnection}</div>
                }
                <div style={{padding: '10px 20px'}}>
                    <h3>{state.Config.Label} {paused ? ' ('+t('task.status.paused')+')' : ''}</h3>
                    <div>
                        <Label>{t('task.status')}</Label>
                        {LastProcessStatus && <div>{LastProcessStatus.StatusString}</div>}
                        {pg && <div><ProgressIndicator title={t('task.progress')} description={LastProcessStatus.StatusString} percentComplete={pg}/></div>}
                    </div>
                    <div>
                        <Label>{t('task.last-sync')}</Label>
                        {moment(state.LastSyncTime).fromNow()}
                    </div>
                </div>
                <Stack horizontal horizontalAlign="end" tokens={{childrenGap:8}} styles={{root:{padding: 10}}}>
                    <DefaultButton
                        data-automation-id="loop"
                        allowDisabledFocus={true}
                        disabled={disabled}
                        checked={false}
                        text={t('task.action.loop')}
                        iconProps={{iconName:'Play'}}
                        onClick={() => socket.sendMessage('CMD', {UUID:state.UUID, Cmd:'loop'})}
                    />
                    <DefaultButton
                        data-automation-id="resync"
                        allowDisabledFocus={true}
                        disabled={disabled}
                        checked={false}
                        text={t('task.action.resync')}
                        iconProps={{iconName:'Sync'}}
                        onClick={() => socket.sendMessage('CMD', {UUID:state.UUID, Cmd:'resync'})}
                    />
                    <DefaultButton
                        iconProps={{iconName:'Edit'}}
                        menuAs={SyncTask.menuAs}
                        menuProps={{
                            items:[
                                {
                                    key: 'edit',
                                    text: t('task.action.edit'),
                                    iconProps: { iconName: 'Edit' },
                                    onClick:()=>openEditor()
                                },
                                {
                                    key: 'pause',
                                    text: paused ? t('task.action.resume') : t('task.action.pause'),
                                    iconProps: { iconName: paused ? 'PlayResume' : 'Pause' },
                                    onClick: () => socket.sendMessage('CMD', {UUID:state.UUID, Cmd: paused ? 'resume' : 'pause'})
                                },
                                {
                                    key: 'delete',
                                    text: t('task.action.delete'),
                                    iconProps: { iconName: 'Delete' },
                                    onClick: () => {
                                        if (window.confirm(t('task.action.delete.confirm'))){
                                            socket.deleteTask(state.Config);
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

SyncTask = withTranslation()(SyncTask);

export {SyncTask as default}
import React, {Fragment} from 'react'
import {ProgressIndicator} from "office-ui-fabric-react/lib/ProgressIndicator";
import {Label} from "office-ui-fabric-react/lib/Label"
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import {Stack} from "office-ui-fabric-react/lib/Stack"
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import EndpointLabel from './EndpointLabel'
import ActionBar from './ActionBar'
import moment from 'moment'
import 'moment/locale/fr';
import 'moment/locale/es';
import 'moment/locale/it';
import {withTranslation} from 'react-i18next'

class SyncTask extends React.Component {

    triggerAction(key) {
        const {state, socket, openEditor, t} = this.props;
        switch (key) {
            case "delete":
                if (window.confirm(t('task.action.delete.confirm'))){
                    socket.deleteTask(state.Config);
                }
                break;
            case "edit":
                openEditor();
                break;
            default:
                socket.sendMessage('CMD', {UUID:state.UUID, Cmd:key});
                break
        }
    }

    render() {

        const {state, t, i18n} = this.props;
        const {LastProcessStatus, LeftProcessStatus, RightProcessStatus, Status, LeftInfo, RightInfo} = state;
        let pg;
        if (LastProcessStatus && LastProcessStatus.Progress) {
            pg = LastProcessStatus.Progress;
        }
        const idle = Status === 0;
        const paused = Status === 1;
        const error = Status === 4;
        const restarting = Status === 5;
        const stopping = Status === 6;

        moment.locale(i18n.language);
        return (
            <Stack styles={{root:{margin:10, boxShadow: Depths.depth4, backgroundColor:'white'}}} vertical>
                <div style={{padding: '10px 20px'}}>
                    <h3 style={{display:'flex', alignItems:'flex-end'}}>
                        {state.Config.Label}
                        {paused ? ' ('+t('task.status.paused')+')' : ''}
                        {restarting ? ' ('+t('task.status.restarting')+'...)' : ''}
                        {stopping ? ' ('+t('task.status.stopping')+'...)' : ''}
                        {error &&
                        <Fragment>
                            &nbsp;
                            <Icon iconName={"Error"} styles={{root:{color:'red'}}}/> ({t('task.status.paused')})
                        </Fragment>
                        }
                    </h3>
                    <div style={{marginBottom: 10}}>
                        <div style={{display:'flex'}}>
                            <EndpointLabel uri={state.Config.LeftURI} info={LeftInfo} status={LeftProcessStatus} t={t} style={{flex: 1, marginRight: 5}}/>
                            <div style={{padding:5}}><Icon iconName={state.Config.Direction === 'Bi' ? 'Sort' : (state.Config.Direction === 'Right' ? 'SortDown' : 'SortUp')}/></div>
                            <EndpointLabel uri={state.Config.RightURI} info={RightInfo} status={RightProcessStatus} t={t} style={{flex: 1, marginLeft: 5}}/>
                        </div>
                    </div>
                    <div>
                        <Label>{t('task.status')}</Label>
                        {!pg && LastProcessStatus && <span>{LastProcessStatus.StatusString}</span>}
                        {!pg && idle && state.LastSyncTime &&
                            <span> - {t('task.last-sync')} : {moment(state.LastSyncTime).fromNow()}</span>
                        }
                        {pg &&
                            <div><ProgressIndicator label={"Processing..."} description={LastProcessStatus.StatusString} percentComplete={pg}/></div>
                        }
                    </div>
                </div>
                <ActionBar triggerAction={this.triggerAction.bind(this)} LeftConnected={LeftInfo.Connected} RightConnected={RightInfo.Connected} Status={Status}/>
            </Stack>
        );

    }

}

SyncTask = withTranslation()(SyncTask);

export {SyncTask as default}
import React, {Fragment} from 'react'
import {ProgressIndicator} from "office-ui-fabric-react/lib/ProgressIndicator";
import {DefaultButton} from "office-ui-fabric-react/lib/Button"
import {Label} from "office-ui-fabric-react/lib/Label"
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import {Stack} from "office-ui-fabric-react/lib/Stack"
import {ContextualMenu} from "office-ui-fabric-react/lib/ContextualMenu"
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import EndpointLabel from './EndpointLabel'
import moment from 'moment'
import 'moment/locale/fr';
import 'moment/locale/es';
import 'moment/locale/it';
import {withTranslation} from 'react-i18next'

class SyncTask extends React.Component {

    static menuAs(menuProps){
        // Customize contextual menu with menuAs
        return <ContextualMenu {...menuProps} />;
    };

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

    buildMenu() {
        const {state} = this.props;
        const {LeftInfo, RightInfo, Status} = state;
        const paused = Status === 1;
        const disabled = !(LeftInfo.Connected && RightInfo.Connected);
        return [
            {key:'loop', disabled: disabled, iconName:'Play'},
            {key:'resync', disabled: disabled, iconName:'Sync'},
            {key:'more', iconName:'Edit', menu:[
                    { key: 'edit', iconName: 'Edit'},
                    { key: paused ? 'resume' : 'pause', iconName: paused?'PlayResume': 'Pause'},
                    { key: 'delete', iconName: 'Delete' }
            ]},
        ];
    }

    render() {

        const {state, t, i18n} = this.props;
        const {LastProcessStatus, LeftProcessStatus, RightProcessStatus, Status, LeftInfo, RightInfo} = state;
        let pg, leftPg, rightPg;
        if (LastProcessStatus && LastProcessStatus.Progress) {
            pg = LastProcessStatus.Progress;
        }
        if (LeftProcessStatus) {
            leftPg = LeftProcessStatus.Progress;
        }
        if (RightProcessStatus) {
            rightPg = RightProcessStatus.Progress;
        }
        const idle = Status === 0;
        const paused = Status === 1;
        const error = Status === 4;
        const restarting = Status === 5;
        const stopping = Status === 6;

        const menu = this.buildMenu();
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
                        <div style={{display:'flex', alignItems:'center'}}>
                            <EndpointLabel uri={state.Config.LeftURI} info={LeftInfo} t={t} style={{flex: 1, marginRight: 5}}/>
                            <div style={{padding:5}}><Icon iconName={state.Config.Direction === 'Bi' ? 'Sort' : (state.Config.Direction === 'Right' ? 'SortDown' : 'SortUp')}/></div>
                            <EndpointLabel uri={state.Config.RightURI} info={RightInfo} t={t} style={{flex: 1, marginLeft: 5}}/>
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
                        {(leftPg > 0) &&
                            <div style={{display: 'flex', alignItems:'center'}}>
                                <Icon iconName={"Search"} styles={{root:{fontSize: 24, margin: 10, marginLeft: 0}}}/>
                                <div style={{flex: 1}}>
                                    {leftPg > 0 && <ProgressIndicator label={"Analyzing Left Endpoint"} description={LeftProcessStatus?LeftProcessStatus.StatusString:''} percentComplete={leftPg}/>}
                                </div>
                            </div>
                        }
                        {(rightPg > 0) &&
                            <div style={{display: 'flex', alignItems:'center'}}>
                                <Icon iconName={"Search"} styles={{root:{fontSize: 24, margin: 10, marginLeft: 0}}}/>
                                <div style={{flex: 1}}>
                                    {rightPg > 0 && <ProgressIndicator label={"Analyzing Right Endpoint"} description={RightProcessStatus?RightProcessStatus.StatusString:''} percentComplete={rightPg}/>}
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <Stack horizontal horizontalAlign="end" tokens={{childrenGap:8}} styles={{root:{padding: 10, paddingTop: 20}}}>
                    {menu.map(({key,disabled,iconName,menu}) => {
                        const props = {key, disabled, iconProps:{iconName}};
                        if (menu) {
                            props.menuAs = SyncTask.menuAs;
                            props.menuProps = {items: menu.map(({key, iconName}) => {
                                return {key: key, text:t('task.action.'+key), iconProps:{iconName}, onClick:()=>{this.triggerAction(key)}}
                            })}
                        } else {
                            props.text = t('task.action.'+key);
                            props.onClick = ()=>{this.triggerAction(key)}
                        }
                        return <DefaultButton {...props}/>
                    })}
                </Stack>
            </Stack>
        );

    }

}

SyncTask = withTranslation()(SyncTask);

export {SyncTask as default}
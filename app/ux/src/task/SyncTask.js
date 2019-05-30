import React, {Fragment} from 'react'
import {ProgressIndicator} from "office-ui-fabric-react/lib/ProgressIndicator";
import {DefaultButton} from "office-ui-fabric-react/lib/Button"
import {Label} from "office-ui-fabric-react/lib/Label"
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import {Stack} from "office-ui-fabric-react/lib/Stack"
import {ContextualMenu} from "office-ui-fabric-react/lib/ContextualMenu"
import { Icon } from 'office-ui-fabric-react/lib/Icon';
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
        const {LastProcessStatus, Status, LeftInfo, RightInfo} = state;
        let pg;
        if (LastProcessStatus && LastProcessStatus.Progress) {
            pg = LastProcessStatus.Progress;
        }
        const paused = Status === 1;
        const error = Status === 4;
        const menu = this.buildMenu();
        moment.locale(i18n.language);
        return (
            <Stack styles={{root:{margin:10, boxShadow: Depths.depth4, backgroundColor:'white'}}} vertical>
                {!LeftInfo.Connected &&
                    <div style={{backgroundColor:'#fde7e9', padding: '10px'}}>{t('task.disconnected') + state.LeftInfo.LastConnection}</div>
                }
                {!RightInfo.Connected &&
                    <div style={{backgroundColor:'#fde7e9', padding: '10px'}}>{t('task.disconnected') + state.RightInfo.LastConnection}</div>
                }
                <div style={{padding: '10px 20px'}}>
                    <h3 style={{display:'flex', alignItems:'flex-end'}}>
                        {state.Config.Label}
                        {paused ? ' ('+t('task.status.paused')+')' : ''}
                        {error &&
                        <Fragment>
                            &nbsp;
                            <Icon iconName={"Error"} styles={{root:{color:'red'}}}/> ({t('task.status.paused')})
                        </Fragment>
                        }
                    </h3>
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
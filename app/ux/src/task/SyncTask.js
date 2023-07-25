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
import React, {Fragment} from 'react'
import {ProgressIndicator} from "office-ui-fabric-react/lib/ProgressIndicator";
import {Label} from "office-ui-fabric-react/lib/Label"
import { Depths } from '@uifabric/fluent-theme/lib/fluent/FluentDepths';
import {Stack} from "office-ui-fabric-react/lib/Stack"
import { Icon } from 'office-ui-fabric-react/lib/Icon';
import {Link} from 'office-ui-fabric-react'
import EndpointLabel from './EndpointLabel'
import ActionBar from './ActionBar'
import humanize from 'humanize'
import moment from 'moment'
import {withTranslation} from 'react-i18next'
import PatchDialog from "./PatchDialog";
import {openPath} from '../models/Open'
import Colors from "../components/Colors";
import ConfirmDialog from "./ConfirmDialog";

const emptyTime = "0001-01-01T00:00:00Z";

//const StatusIdle = 0;
const StatusPaused = 1;
//const StatusDisabled = 2;
const StatusProcessing = 3;
const StatusError = 4;
const StatusRestarting = 5;
const StatusStopping = 6;

class SyncTask extends React.Component {

    constructor(props) {
        super(props);
        this.state = {lastPatch: false};
    }


    triggerAction(key) {
        const {state, socket, openEditor} = this.props;
        switch (key) {
            case "delete":
                this.setState({confirmDelete: true})
                break;
            case "deleteApply":
                this.setState({confirmDelete: false})
                socket.deleteTask(state.Config);
                break;
            case "edit":
                openEditor();
                break;
            default:
                socket.sendMessage('CMD', {UUID:state.UUID, Cmd:key});
                break
        }
    }

    openEndpointRoot(lnk) {
        this.openPath(lnk, true)
    }

    openPath(path, isURI = false){
        const {state} = this.props;
        openPath(path, state, isURI);
    }

    computeStatus() {
        const {state, t} = this.props;
        const {LastProcessStatus, LeftInfo, RightInfo, Status, LastSyncTime, LastOpsTime} = state;

        switch (Status) {
            case StatusPaused:
                return <span>{t('task.status.paused')}</span>;

            case StatusRestarting:
                return <span>{t('task.status.restarting')}</span>;

            case StatusStopping:
                return <span>{t('task.status.stopping')}</span>;

            case StatusError:
                return (
                    <Fragment>
                        &nbsp;
                        <Icon iconName={"Error"} styles={{root:{color:Colors.error, marginRight:5}}}/> {t('task.status.paused')}
                        {LastOpsTime && LastOpsTime !== emptyTime &&
                            <span>&nbsp;-&nbsp;<Link onClick={()=>{this.setState({lastPatch:true})}}>{"Display errors"}</Link></span>
                        }
                    </Fragment>
                );

            case StatusProcessing:
                if (LastProcessStatus && LastProcessStatus.Progress) {
                    return (
                        <div>
                            <ProgressIndicator label={t('task.status.processing')} description={LastProcessStatus.StatusString} percentComplete={LastProcessStatus && LastProcessStatus.Progress}/>
                        </div>
                    );
                } else {
                    return (LastProcessStatus ? <span>{LastProcessStatus.StatusString}</span> : <span>{t('task.status.processing')}</span> );
                }

            default:

                return (
                    <Fragment>
                        {LastProcessStatus && LastProcessStatus.StatusString !== "Idle" &&
                            <span>{LastProcessStatus.StatusString}</span>
                        }
                        {!LastProcessStatus && (!LeftInfo.Connected || !RightInfo.Connected) &&
                        <Fragment>
                            &nbsp;
                            <Icon iconName={"Error"} styles={{root:{color:Colors.error, marginRight:5}}}/> {t('task.status.disconnected.'+(LeftInfo.Connected ? 'right' : 'left'))}
                        </Fragment>
                        }
                        {LastSyncTime && LastSyncTime !== emptyTime &&
                            <span>{t('task.last-sync')} : {moment(LastSyncTime).fromNow()}</span>
                        }
                        {LastOpsTime && LastOpsTime !== emptyTime &&
                            <span> - {t('task.last-ops')} : <Link onClick={()=>{this.setState({lastPatch:true})}}>{moment(LastOpsTime).fromNow()}</Link></span>
                        }
                    </Fragment>
                );
        }
    }

    computeStatistics() {
        const {state, t, i18n} = this.props;
        const {LeftInfo, RightInfo} = state;
        moment.locale(i18n.language);
        let size, folders, files;
        if(LeftInfo.Stats && LeftInfo.Stats.HasSizeInfo){
            size = LeftInfo.Stats.Size
        }
        if(RightInfo.Stats && RightInfo.Stats.HasSizeInfo){
            size = RightInfo.Stats.Size
        }
        if(LeftInfo.Stats && LeftInfo.Stats.HasChildrenInfo){
            folders = LeftInfo.Stats.Folders;
            files = LeftInfo.Stats.Files;
        }
        if(RightInfo.Stats && RightInfo.Stats.HasChildrenInfo){
            folders = RightInfo.Stats.Folders;
            files = RightInfo.Stats.Files;
        }
        if(size === undefined && folders === undefined) {
            return null;
        }
        const blocks = [];
        if (size !== undefined) {
            blocks.push(t('task.stats.size') + " : " + humanize.filesize(size));
        }
        if (folders !== undefined) {
            blocks.push(t('task.stats.folders') + " : " + folders);
            blocks.push(t('task.stats.files') + " : " + files);
        }
        return (
            <div>{blocks.join(" - ")}</div>
        );
    }

    render() {

        const {state, t} = this.props;
        const {LeftProcessStatus, RightProcessStatus, Status, LeftInfo, RightInfo, Config} = state;
        const {lastPatch, confirmDelete} = this.state;

        const styles =  {
            dirIcon:{
                padding: 6,
                fontSize: 24,
                color: Colors.tint50,
                transform: 'rotate(90deg)',
                width: 36,
                height: 36,
                boxSizing: 'border-box',
            },
            label:{
                color: Colors.tint70,
                marginTop: 10
            }
        };
        const status = this.computeStatus();
        const stats = this.computeStatistics();
        const directionStyle = {...styles.dirIcon}
        if(Config.Realtime && Status !== 1){
            if(!LeftInfo.Connected || !RightInfo.Connected){
                directionStyle.color = Colors.error
            } else {
                directionStyle.color = Colors.success;
            }
        }

        return (
            <React.Fragment>
                <PatchDialog
                    syncConfig={lastPatch ? Config : null}
                    hidden={!lastPatch}
                    onDismiss={()=>{this.setState({lastPatch: false})}}
                    openPath={(path)=>{this.openPath(path, false)}}
                />
                <ConfirmDialog
                    open={confirmDelete}
                    title={t('task.action.delete.title')}
                    sentence={t('task.action.delete.confirm')}
                    destructive={true}
                    confirmLabel={t('task.action.delete')}
                    onDismiss={() => {this.setState({confirmDelete: false})}}
                    onConfirm={() => {this.triggerAction('deleteApply')}}
                />
                <Stack styles={{root:{margin:16, borderRadius:3, boxShadow: Depths.depth4, backgroundColor:'white'}}} vertical>
                    <div style={{padding: '0px 16px 10px'}}>
                        <h2 style={{display:'none', alignItems:'flex-end', fontWeight:400}}>{Config.Label}</h2>
                        <div style={{marginBottom: 10, marginTop:30}}>
                            <div style={{display:'flex'}}>
                                <EndpointLabel uri={Config.LeftURI} info={LeftInfo} status={LeftProcessStatus || {}} t={t} style={{flex: 1, marginRight: 5}} openRoot={this.openEndpointRoot.bind(this)}/>
                                <div style={directionStyle}><Icon iconName={state.Config.Direction === 'Bi' ? 'Sort' : (Config.Direction === 'Right' ? 'SortUp' : 'SortDown')}/></div>
                                <EndpointLabel uri={Config.RightURI} info={RightInfo} status={RightProcessStatus || {}} t={t} style={{flex: 1, marginLeft: 5}} openRoot={this.openEndpointRoot.bind(this)}/>
                            </div>
                        </div>
                        <div style={{color:'#212121'}}>
                            <Label styles={{root:styles.label}}>{t('task.status')}</Label>
                            {status}
                            {stats &&
                                <Fragment>
                                    <Label styles={{root:styles.label}}>{t('task.stats')}</Label>
                                    {stats}
                                </Fragment>
                            }
                        </div>
                    </div>
                    <ActionBar triggerAction={this.triggerAction.bind(this)} LeftConnected={LeftInfo.Connected} RightConnected={RightInfo.Connected} Status={Status} Realtime={Config.Realtime}/>
                </Stack>
            </React.Fragment>
        );

    }

}

SyncTask = withTranslation()(SyncTask);

export {SyncTask as default}
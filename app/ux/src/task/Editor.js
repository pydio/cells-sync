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
import {Config} from '../models/Config'
import { Label } from 'office-ui-fabric-react/lib/Label';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Dropdown } from 'office-ui-fabric-react/lib/Dropdown';
import 'observable-slim/proxy'
import ObservableSlim from 'observable-slim'
import EndpointPicker from './EndpointPicker'
import {renderOptionWithIcon, renderTitleWithIcon} from "../components/DropdownRender";
import SelectiveFolders from "./SelectiveFolders";
import { Separator } from 'office-ui-fabric-react/lib/Separator';
import {Stack} from "office-ui-fabric-react/lib/Stack";
import { DefaultButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button';
import {withTranslation} from 'react-i18next'
import {Toggle} from "office-ui-fabric-react";
import Schedule from './Schedule'
import Storage from "../oidc/Storage";

class Editor extends React.Component {

    constructor(props){
        super(props);
        const {task} = this.props;
        let t, isNew;
        if (task === true) {
            isNew = true;
            t = Config;
        } else {
            isNew = false;
            t = task;
        }
        if(localStorage.getItem("Editor.SavedState")) {
            const saved = JSON.parse(localStorage.getItem("Editor.SavedState"));
            if(saved && saved.task) {
                t = saved.task;
            }
            localStorage.removeItem("Editor.SavedState");
        }
        t = JSON.parse(JSON.stringify(t));
        const proxy = ObservableSlim.create(t, true, () => {
            this.setState({task: proxy});
        });
        this.state = {task: proxy, isNew};
    }

    save(){
        const {task, isNew} = this.state;
        const {socket, onDismiss} = this.props;
        const config = task.__getTarget;
        const cmd = isNew ? "create" : "edit";
        socket.sendMessage('CONFIG', {Cmd:cmd, Task: config.Config});
        onDismiss();
    }

    onCreateServer(loginUrl, position) {
        const {task, isNew} = this.state;
        let editState;
        if(isNew){
            editState = {create: true}
        } else {
            editState = {edit: task.Config.Uuid};
        }
        const saveTask = task.__getTarget;
        if(position === "left") {
            saveTask.Config.LeftURI = loginUrl;
        } else if(position === "right") {
            saveTask.Config.RightURI = loginUrl;
        }
        localStorage.setItem("Editor.SavedState", JSON.stringify({task: saveTask}));
        Storage.newManager(loginUrl, editState).signinRedirect();
    }


    render() {
        const {task, isNew} = this.state;
        const {onDismiss, t, socket} = this.props;
        return (
            <div>
                {!isNew &&
                    <React.Fragment>
                        <Label htmlFor={"uuid"}>{t('editor.uuid')}</Label>
                        <TextField id={"uuid"} readOnly={true} placeholder={t('editor.uuid.placeholder')} value={task.Config.Uuid}/>
                    </React.Fragment>
                }
                <TextField label={t('editor.label')} placeholder={t('editor.label.placeholder')} value={task.Config.Label} onChange={(e, v) => {task.Config.Label = v}}/>
                <Label htmlFor={"left"}>{t('editor.source')}</Label>
                <EndpointPicker value={task.Config.LeftURI} onChange={(e, v) => {task.Config.LeftURI = v}} socket={socket} onCreateServer={(url) => this.onCreateServer(url, "left")}/>
                <Label htmlFor={"right"}>{t('editor.target')}</Label>
                <EndpointPicker value={task.Config.RightURI} onChange={(e, v) => {task.Config.RightURI = v}} socket={socket} onCreateServer={(url) => this.onCreateServer(url, "right")}/>
                <Dropdown
                    label={t('editor.direction')}
                    selectedKey={task.Config.Direction}
                    onChange={(e, item)=>{task.Config.Direction = item.key}}
                    placeholder={t('editor.direction.placeholder')}
                    onRenderOption={renderOptionWithIcon}
                    onRenderTitle={renderTitleWithIcon}
                    options={[
                        { key: 'Bi', text: t('editor.direction.bi'), data: { icon: 'Sort' } },
                        { key: 'Right', text: t('editor.direction.right'), data: { icon: 'SortDown' } },
                        { key: 'Left', text: t('editor.direction.left'), data: { icon: 'SortUp' } },
                    ]}
                />
                <Separator styles={{root:{marginTop: 10}}}>Advanced</Separator>
                {task.Config.LeftURI &&
                    <SelectiveFolders leftURI={task.Config.LeftURI} value={task.Config.SelectiveRoots} onChange={(e,v) => {task.Config.SelectiveRoots = v}}/>
                }
                <Toggle
                    label={t('editor.triggers.hard')}
                    defaultChecked={task.Config.HardInterval !== ""}
                    onText={<span>{t('editor.triggers.hard.enabled').replace('%s', Schedule.makeReadableString(t, Schedule.parseIso8601(task.Config.HardInterval), false))} <Schedule
                        displayType={"icon"}
                        hideManual={true}
                        label={t('editor.triggers.hard')}
                        schedule={task.Config.HardInterval}
                        onChange={(v) => {task.Config.HardInterval = v}}
                    /></span>}
                    offText={t('editor.triggers.hard.disabled')}
                    onChange={(e, v) => {
                        if (v) {
                            const daytime = new Date();
                            daytime.setHours(9);
                            daytime.setMinutes(0);
                            task.Config.HardInterval = Schedule.makeIso8601FromState({frequency:'daily', daytime:daytime});
                        } else {
                            task.Config.HardInterval = "";
                        }
                    }}
                />
                <Toggle
                    label={t('editor.triggers.realtime')}
                    defaultChecked={task.Config.Realtime}
                    onText={t('editor.triggers.realtime.enabled')}
                    offText={t('editor.triggers.realtime.disabled')}
                    onChange={(e, v) => {task.Config.Realtime = v}}
                />
                {!task.Config.Realtime &&
                    <Schedule
                        label={t('editor.triggers.syncloop')}
                        schedule={task.Config.LoopInterval}
                        onChange={(v) => {task.Config.LoopInterval = v}}
                    />
                }
                <Stack horizontal tokens={{childrenGap: 8}} horizontalAlign="center" styles={{root:{marginTop: 30}}}>
                    <DefaultButton text={t('button.cancel')} onClick={onDismiss}/>
                    <PrimaryButton text={t('button.save')} onClick={() => this.save()}/>
                </Stack>
            </div>
        )
    }

}

Editor = withTranslation()(Editor);
export default Editor
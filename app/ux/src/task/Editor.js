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
import 'observable-slim/proxy'
import ObservableSlim from 'observable-slim'
import parse from 'url-parse'
import basename from 'basename'
import { Label, TextField, Dropdown, Separator, Stack, DefaultButton, PrimaryButton, Toggle, Icon, TooltipHost, TooltipDelay, DirectionalHint } from 'office-ui-fabric-react';
import {Config, DefaultDirLoader} from '../models/Config'
import EndpointPicker from './EndpointPicker'
import SelectiveFolders from "./SelectiveFolders";
import {renderOptionWithIcon, renderTitleWithIcon} from "../components/DropdownRender";
import {withTranslation} from 'react-i18next'
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
        if(isNew) {
            // Pre-select server if page is called via /create?id=serverID
            const p = parse(window.location.href, {}, true);
            if(p.query && p.query["id"]) {
                t.Config.LeftURI = p.query["id"];
            }
        }
        const proxy = ObservableSlim.create(t, true, () => {
            this.setState({task: proxy});
        });
        this.state = {task: proxy, isNew, showAdvanced: !isNew};
        if(isNew){
            this.state.LeftURIInvalid = true;
            this.state.RightURIInvalid = true;
            DefaultDirLoader.getInstance().onDefaultDir().then(defaultPath => {
                if(defaultPath){
                    const p = parse(proxy.Config.RightURI, {}, true);
                    p.set('pathname', defaultPath);
                    proxy.Config.RightURI = p.toString();
                    this.setState({RightURIInvalid: false});
                }
            })
        }
    }

    save(){
        const {task, isNew} = this.state;
        const {socket, onDismiss} = this.props;
        const config = task.__getTarget;
        const cmd = isNew ? "create" : "edit";
        config.Config.Label = [this.recomputeLabel(config.Config.LeftURI), " <> ", this.recomputeLabel(config.Config.RightURI)].join('');
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
        Storage.signin(loginUrl, editState).catch((e) => {
            const s = {};
            s[position + 'ServerError'] = e.message;
            this.setState(s)
        });
    }

    labelForPicker(id, type, edit, editProp){
        const {t} = this.props;
        return (
            <Label styles={{root:{display:'flex', alignItems:'center'}}} htmlFor={id}>{t('editor.picker.type.' + type)}
                {!edit &&
                    <TooltipHost id={"button-" + id} content={t("editor.picker.type.edit")} delay={TooltipDelay.zero}>
                        <span style={{opacity:0.4, fontWeight: 'normal', marginLeft: 5, cursor: 'pointer'}} onClick={()=>{
                            const s = {};
                            s[editProp] = true;
                            this.setState(s)}
                        }>({t("editor.picker.type.link")})</span>
                    </TooltipHost>
                }
            </Label>
        );
    }

    onChangeURI(field, value){
        const {task} = this.state;
        const {t} = this.props;
        task.Config[field] = value;
        const s = {};
        // Check validity
        const parsed = parse(value, {}, true);
        if(parsed.pathname === '') {
            s[field + 'Invalid'] = true;
            s[field + 'InvalidMsg'] = t('editor.path.invalid.empty');
        } else if(parsed.protocol === 'fs:' && parsed.pathname === '/'){
            s[field + 'Invalid'] = true;
            s[field + 'InvalidMsg'] = t('editor.path.invalid.root')
        } else {
            s[field + 'Invalid'] = undefined;
            s[field + 'InvalidMsg'] = undefined
        }
        this.setState(s);
    }

    recomputeLabel(uri){
        const parsed = parse(uri, {}, true);
        if(parsed.protocol.indexOf('http') === 0) {
            return parsed.host;
        } else {
            return basename(parsed.pathname);
        }
    }

    render() {
        const {task, isNew, editRightType, editLeftType, editDir, showAdvanced, LeftURIInvalid, RightURIInvalid,
            LeftURIInvalidMsg, RightURIInvalidMsg, leftServerError, rightServerError} = this.state;
        const {onDismiss, t, socket} = this.props;
        const leftType = parse(task.Config.LeftURI, {}, true)['protocol'].replace(":", "");
        const rightType = parse(task.Config.RightURI, {}, true)['protocol'].replace(":", "");
        const sectionStyles = {root:{backgroundColor:'rgb(243, 245, 246)', borderRadius: 8, padding: 16, paddingTop: 8}};
        return (
            <div>
                <Stack vertical tokens={{childrenGap: 8}}>
                    <Stack.Item styles={sectionStyles}>
                        {this.labelForPicker("left", leftType, editLeftType, "editLeftType")}
                        <EndpointPicker
                            value={task.Config.LeftURI}
                            onChange={(e, v) => this.onChangeURI('LeftURI', v)}
                            editType={editLeftType}
                            socket={socket}
                            onCreateServer={(url) => this.onCreateServer(url, "left")}
                            invalid={LeftURIInvalidMsg}
                            serverError={leftServerError}
                        />
                    </Stack.Item>
                    <Stack.Item styles={{root:{display:'flex', alignItems:'center', justifyContent:'center', padding: 5}}}>
                        {!editDir &&
                            <TooltipHost
                                id={"dir-edit"}
                                content={t("editor.direction." + task.Config.Direction.toLowerCase())}
                                delay={TooltipDelay.zero}
                                directionalHint={DirectionalHint.rightCenter}
                            >
                                <div
                                    onClick={()=>{this.setState({editDir: true})}}
                                    style={{textAlign:'center', cursor:'pointer', fontSize: 20, backgroundColor:'#607D8B', width:40, height: 40, borderRadius: '50%', padding: 8, boxSizing: 'border-box', color:'white'}}>
                                    <Icon iconName={"Sort" + (task.Config.Direction === 'Bi' ? '' : (task.Config.Direction === 'Right' ? 'Down' : 'Up'))}/>
                                </div>
                            </TooltipHost>
                        }
                        {editDir &&
                            <Dropdown
                                styles={{root:{minWidth:250, padding:4, backgroundColor:'#607D8B', borderRadius: 4}}}
                                selectedKey={task.Config.Direction}
                                onChange={(e, item)=>{
                                    task.Config.Direction = item.key;
                                    this.setState({editDir: false})
                                }}
                                placeholder={t('editor.direction.placeholder')}
                                onRenderOption={renderOptionWithIcon}
                                onRenderTitle={renderTitleWithIcon}
                                options={[
                                    { key: 'Bi', text: t('editor.direction.bi'), data: { icon: 'Sort' } },
                                    { key: 'Right', text: t('editor.direction.right'), data: { icon: 'SortDown' } },
                                    { key: 'Left', text: t('editor.direction.left'), data: { icon: 'SortUp' } },
                                ]}
                            />
                        }
                    </Stack.Item>
                    <Stack.Item styles={sectionStyles}>
                        {this.labelForPicker("right", rightType, editRightType, "editRightType")}
                        <EndpointPicker
                            value={task.Config.RightURI}
                            onChange={(e, v) => this.onChangeURI('RightURI', v)}
                            editType={editRightType}
                            socket={socket}
                            onCreateServer={(url) => this.onCreateServer(url, "right")}
                            invalid={RightURIInvalidMsg}
                            serverError={rightServerError}
                        />
                    </Stack.Item>
                </Stack>
                <Separator alignContent={"center"} styles={{root:{marginTop: 20, marginBottom: 20}}}>
                    <div style={{fontSize: 16, cursor:'pointer'}} onClick={() => {this.setState({showAdvanced:!showAdvanced})}}>{t('editor.section.advanced')} <Icon styles={{root:{fontSize: 11}}} iconName={showAdvanced?"ChevronDown":"ChevronRight"}/></div>
                </Separator>
                {showAdvanced &&
                    <Stack vertical tokens={{childrenGap: 8}} styles={sectionStyles}>
                        <Stack.Item>
                            {task.Config.LeftURI &&
                            <SelectiveFolders leftURI={task.Config.LeftURI} value={task.Config.SelectiveRoots} onChange={(e,v) => {task.Config.SelectiveRoots = v}}/>
                            }
                        </Stack.Item>
                        <Stack.Item>
                            <Toggle
                                label={t('editor.triggers.realtime')}
                                defaultChecked={task.Config.Realtime}
                                onText={t('editor.triggers.realtime.enabled')}
                                offText={t('editor.triggers.realtime.disabled')}
                                onChange={(e, v) => {task.Config.Realtime = v}}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            {!task.Config.Realtime &&
                            <Schedule
                                label={t('editor.triggers.syncloop')}
                                schedule={task.Config.LoopInterval}
                                onChange={(v) => {task.Config.LoopInterval = v}}
                            />
                            }
                        </Stack.Item>
                        <Stack.Item>
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
                        </Stack.Item>
                        {!isNew &&
                        <Stack.Item>
                            <Label htmlFor={"uuid"}>{t('editor.uuid')}</Label>
                            <TextField id={"uuid"} readOnly={true} disabled={true} placeholder={t('editor.uuid.placeholder')} value={task.Config.Uuid}/>
                        </Stack.Item>
                        }
                    </Stack>
                }
                <Stack horizontal tokens={{childrenGap: 8}} horizontalAlign="center" styles={{root:{marginTop: 30}}}>
                    <DefaultButton text={t('button.cancel')} onClick={onDismiss}/>
                    <PrimaryButton text={t('button.save')} onClick={() => this.save()} disabled={LeftURIInvalid || RightURIInvalid}/>
                </Stack>
            </div>
        )
    }

}

Editor = withTranslation()(Editor);
export default Editor
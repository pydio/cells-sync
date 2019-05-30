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
        t = JSON.parse(JSON.stringify(t));
        const proxy = ObservableSlim.create(t, true, () => {
            this.setState({task: proxy});
        });
        this.state = {task: proxy, isNew};
    }

    componentWillReceiveProps(){

    }

    save(){
        const {task, isNew} = this.state;
        const {socket, onDismiss} = this.props;
        const config = task.__getTarget;
        const cmd = isNew ? "create" : "edit";
        socket.sendMessage('CONFIG', {Cmd:cmd, Config: config.Config});
        onDismiss();
    }


    render() {
        const {task, isNew} = this.state;
        const {onDismiss, t} = this.props;
        return (
            <div>
                {!isNew &&
                    <React.Fragment>
                        <Label htmlFor={"uuid"}>{t('editor.uuid')}</Label>
                        <TextField id={"uuid"} disabled={true} placeholder={t('editor.uuid.placeholder')} value={task.Config.Uuid}/>
                    </React.Fragment>
                }
                <TextField label={t('editor.label')} placeholder={t('editor.label.placeholder')} value={task.Config.Label} onChange={(e, v) => {task.Config.Label = v}}/>
                <Label htmlFor={"left"}>{t('editor.source')}</Label>
                <EndpointPicker value={task.Config.LeftURI} onChange={(e, v) => {task.Config.LeftURI = v}}/>
                <Label htmlFor={"right"}>{t('editor.target')}</Label>
                <EndpointPicker value={task.Config.RightURI} onChange={(e, v) => {task.Config.RightURI = v}}/>
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
                <Separator styles={{root:{marginTop: 10}}}/>
                {task.Config.LeftURI &&
                    <SelectiveFolders leftURI={task.Config.LeftURI} value={task.Config.SelectiveRoots} onChange={(e,v) => {task.Config.SelectiveRoots = v}}/>
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
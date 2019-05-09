import React from 'react'
import {Config} from '../models/Config'
import { Label } from 'office-ui-fabric-react/lib/Label';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Dropdown } from 'office-ui-fabric-react/lib/Dropdown';
import ObservableSlim from 'observable-slim'
import EndpointPicker from './EndpointPicker'
import {renderOptionWithIcon, renderTitleWithIcon} from "../components/DropdownRender";
import SelectiveFolders from "./SelectiveFolders";
import { Separator } from 'office-ui-fabric-react/lib/Separator';
import {Stack} from "office-ui-fabric-react/lib/Stack";
import { DefaultButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button';

export default class Editor extends React.Component {

    constructor(props){
        super(props);
        const {task} = this.props;
        let t, isNew;
        if (task === true) {
            isNew = true;
            t = Config
        } else {
            isNew = false;
            t = task
        }
        t = JSON.parse(JSON.stringify(t));
        const proxy = ObservableSlim.create(t, true, () => {
            this.setState({task: proxy});
        });
        this.state = {task: proxy, isNew};
    }

    save(){
        const {task, isNew} = this.state;
        const {sendMessage, onDismiss} = this.props;
        const config = task.__getTarget;
        const cmd = isNew ? "create" : "edit";
        sendMessage('CONFIG', {Cmd:cmd, Config: config.Config});
        onDismiss();
    }


    render() {
        const {task, isNew} = this.state;
        const {onDismiss} = this.props;
        return (
            <div>
                {!isNew &&
                    <React.Fragment>
                        <Label htmlFor={"uuid"}>Task UUID</Label>
                        <TextField id={"uuid"} disabled={true} placeholder={"Uuid"} value={task.Config.Uuid}/>
                    </React.Fragment>
                }
                <TextField label={"Label"} placeholder={"Task Label"} value={task.Config.Label} onChange={(e, v) => {task.Config.Label = v}}/>
                <Label htmlFor={"left"}>Source</Label>
                <EndpointPicker value={task.Config.LeftURI} onChange={(e, v) => {task.Config.LeftURI = v}}/>
                <Label htmlFor={"right"}>Target</Label>
                <EndpointPicker value={task.Config.RightURI} onChange={(e, v) => {task.Config.RightURI = v}}/>
                <Dropdown
                    label="Sync Direction"
                    selectedKey={task.Config.Direction}
                    onChange={(e, item)=>{task.Config.Direction = item.key}}
                    placeholder="How files are synced between endpoints"
                    onRenderOption={renderOptionWithIcon}
                    onRenderTitle={renderTitleWithIcon}
                    options={[
                        { key: 'Bi', text: 'Bi-directionnal', data: { icon: 'Sort' } },
                        { key: 'Right', text: 'Mirror (download only)', data: { icon: 'SortDown' } },
                        { key: 'Left', text: 'Backup (upload only)', data: { icon: 'SortUp' } },
                    ]}
                />
                <Separator styles={{root:{marginTop: 10}}}/>
                <SelectiveFolders value={task.Config.SelectiveRoots} onChange={(e,v) => {task.Config.SelectiveRoots = v}}/>

                <Stack horizontal tokens={{childrenGap: 8}} horizontalAlign="center" styles={{root:{marginTop: 30}}}>
                    <DefaultButton text={"Cancel"} onClick={onDismiss}/>
                    <PrimaryButton text={"Save"} onClick={() => this.save()}/>
                </Stack>
            </div>
        )
    }

}
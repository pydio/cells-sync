import React from 'react'
import {Stack} from "office-ui-fabric-react/lib/Stack"
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Toggle } from 'office-ui-fabric-react/lib/Toggle';
import { IconButton } from 'office-ui-fabric-react/lib/Button'


export default class SelectiveFolders extends React.Component{

    constructor(props) {
        super(props);
        this.state = {newFolder:''};
    }


    parsed(){
        const {value} = this.props;
        let folders, enabled;
        if (value !== undefined && value !== null && value.length !== undefined){ // check it's an array, even if empty
            folders = value;
            enabled = true;
        } else {
            if (value === undefined || value == null){
                enabled = false;
            } else {
                enabled = true;
            }
            folders = [];
        }
        return {enabled, folders};
    }

    update(event, value, type, key = null){
        let {folders} = this.parsed();
        const {onChange} = this.props;
        if (type === 'enabled'){
            if (value){
                folders = [];
            } else {
                folders = undefined;
            }
        } else {
            let newFolders = folders || [];
            newFolders = newFolders.map((f,k) => {
                return (key === k ? value : f);
            });
            folders = newFolders;
        }
        onChange(event, folders)
    }

    add(event){
        let {folders} = this.parsed();
        const {newFolder} = this.state;
        const {onChange} = this.props;
        folders = folders || [];
        folders.push(newFolder);
        this.setState({newFolder:""});
        onChange(event, folders);
    }

    remove(event, key){
        let {folders} = this.parsed();
        const {onChange} = this.props;
        folders = folders || [];
        folders = folders.filter((f, k) => {
            return k !== key;
        });
        onChange(event, folders);
    }

    render(){
        const {folders, enabled} = this.parsed();
        const {newFolder} = this.state;

        return (
            <Stack vertical tokens={{childrenGap: 8}}>
                <Toggle
                    label={"Selective Sync"}
                    defaultChecked={enabled}
                    onText="Enabled"
                    offText="Disabled (all folders)"
                    onChange={(e, v) => {this.update(e, v, 'enabled')}}
                />
                {enabled &&
                    <React.Fragment>
                    {folders.map((f,k) => {
                        return (
                            <Stack horizontal tokens={{childrenGap: 8}} key={k} >
                                <Stack.Item>
                                    <IconButton
                                        iconProps={{ iconName: 'Remove' }}
                                        title={"Remove"}
                                        onClick={(e) => {this.remove(e, k)}}
                                    />
                                </Stack.Item>
                                <Stack.Item grow>
                                    <TextField
                                        autoFocus={false}
                                        value={f}
                                        onChange={(e,v) => {this.update(e, v, 'folder', k)}}
                                        iconProps={{ iconName: 'FolderList' }}
                                    /></Stack.Item>
                            </Stack>
                        )

                    })}
                        <Stack horizontal tokens={{childrenGap: 8}} key={'NEW-FOLDER'} >
                            <Stack.Item>
                                <IconButton
                                    disabled={!newFolder}
                                    iconProps={{ iconName: 'Add' }}
                                    title={"Add"}
                                    onClick={(e) => {this.add(e)}}
                                />
                            </Stack.Item>
                            <Stack.Item grow>
                                <TextField
                                    autoFocus={false}
                                    placeholder={"Select folder to sync"}
                                    value={newFolder}
                                    onChange={(e,v)=>{this.setState({newFolder:v})}}
                                    key={"new_value"}
                                    iconProps={{ iconName: 'FolderList' }}
                                /></Stack.Item>
                        </Stack>
                    </React.Fragment>
                }
            </Stack>
        );

    }

}
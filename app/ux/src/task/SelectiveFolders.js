import React from 'react'
import {Stack} from "office-ui-fabric-react/lib/Stack"
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Toggle } from 'office-ui-fabric-react/lib/Toggle';
import { IconButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button'
import TreeDialog from "./TreeDialog"
import {withTranslation} from 'react-i18next'

class SelectiveFolders extends React.Component{

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

    onSelect(selection){
        let {folders} = this.parsed();
        const {onChange} = this.props;
        selection.forEach(folder => {
            folders.push(folder);
        });
        onChange(null, folders);
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
        const {dialog} = this.state;
        const {t} = this.props;

        return (
            <React.Fragment>
                <Stack vertical tokens={{childrenGap: 8}}>
                    <Toggle
                        label={t('editor.selective')}
                        defaultChecked={enabled}
                        onText={t('editor.selective.on')}
                        offText={t('editor.selective.off')}
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
                                            title={t('editor.selective.remove')}
                                            onClick={(e) => {this.remove(e, k)}}
                                        />
                                    </Stack.Item>
                                    <Stack.Item grow>
                                        <TextField
                                            readOnly={true}
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
                                    <PrimaryButton
                                        iconProps={{iconName:'Add'}}
                                        onClick={()=>{this.setState({dialog: true})}}>{t('editor.selective.add')}</PrimaryButton>
                                </Stack.Item>
                            </Stack>
                        </React.Fragment>
                    }
                </Stack>
                <TreeDialog
                    uri={this.props.leftURI}
                    hidden={!dialog}
                    onDismiss={()=>{this.setState({dialog: false})}}
                    onSelect={this.onSelect.bind(this)}
                />
            </React.Fragment>
        );

    }

}

SelectiveFolders = withTranslation()(SelectiveFolders);

export default SelectiveFolders
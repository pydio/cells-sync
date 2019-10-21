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
import {Stack} from "office-ui-fabric-react/lib/Stack"
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Toggle } from 'office-ui-fabric-react/lib/Toggle';
import { IconButton, PrimaryButton } from 'office-ui-fabric-react/lib/Button'
import TreeDialog from "./TreeDialog"
import {withTranslation} from 'react-i18next'

class SelectiveFolders extends React.Component{

    constructor(props) {
        super(props);
        this.state = {newFolder:'', creates:{}};
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
        const creates = [];
        selection.forEach(folder => {
            if (folder instanceof Object){
                if(folder.node && folder.node.fromTree !== 'both') {
                    creates.push(folder.node);
                }
                folders.push(folder.path);
            } else {
                folders.push(folder);
            }
        });
        Promise.all(creates.map(n => n.createIfNotExists())).then(
            onChange(null, folders)
        );
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
        const {t, leftURI, rightURI} = this.props;

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
                                            iconProps={{ iconName: 'Delete' }}
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
                    uri={leftURI}
                    parallelUri={rightURI}
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
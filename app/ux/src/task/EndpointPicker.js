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
import { Dropdown } from 'office-ui-fabric-react/lib/Dropdown';
import { PrimaryButton } from 'office-ui-fabric-react/lib/Button';
import {renderOptionWithIcon, renderTitleWithIcon} from "../components/DropdownRender";
import parse from 'url-parse'
import TreeDialog from './TreeDialog'
import {withTranslation} from 'react-i18next'
import EndpointTypes from '../models/EndpointTypes'
import Storage from "../oidc/Storage";

class EndpointPicker extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            auths:[],
            dialog: false,
            pathDisabled: this.pathIsDisabled(parse(props.value, {}, true)),
        };
    }

    componentDidMount(){
        const {socket} = this.props;
        this._listener = (auths) => {
            this.setState({auths: auths || []});
        };
        socket.listenAuthorities(this._listener);
        Storage.getInstance(socket).listServers();
    }

    componentWillUnmount(){
        const {socket} = this.props;
        socket.stopListeningAuthorities(this._listener)
    }

    pathIsDisabled(url){
        let pathDisabled = false;
        if(url.protocol && url.protocol.indexOf('http') === 0) {
            pathDisabled = !url.host;
        }
        return pathDisabled
    }

    updateUrl(newUrl, startPort = false) {
        const {onChange} = this.props;
        this.setState({
            pathDisabled: this.pathIsDisabled(newUrl),
        });
        onChange(null, newUrl.toString());
    }

    onSelect(selection){
        if(selection && selection.length){
            const {value, onChange} = this.props;
            const url = parse(value, {}, true);
            url.set('pathname', selection[0]);
            onChange(null, url.toString());
        }
    }

    createAuthority(){
        const {onCreateServer} = this.props;
        const {loginUrl} = this.state;
        onCreateServer(loginUrl);
    }


    render(){
        const {dialog, pathDisabled, auths, createServer, loginUrl} = this.state;
        const {value, t} = this.props;
        const url = parse(value, {}, true);
        const rootUrl = parse(value, {}, true);
        const selectedPath = rootUrl.pathname;
        rootUrl.set('pathname', '');

        const pathField = (
            <TextField
                placeholder={t('editor.picker.path')}
                value={url.pathname}
                onChange={(e, v) => {
                    url.set('pathname', v);
                    this.updateUrl(url);
                }}
                iconProps={{iconName:"FolderList"}}
                readOnly={true}
                disabled={pathDisabled}
                onClick={() => {this.setState({dialog: true})}}
            />
        );

        const authValues = auths.map(({uri}) => {
            const parsed = parse(uri, {}, true);
            return { key: parsed.host, text: uri, data:{uri}}
        });
        authValues.push({key:'__CREATE__', text:'Add new server...'});

        return (
            <Stack horizontal tokens={{childrenGap: 8}} >
                <Dropdown
                    selectedKey={url.protocol === 'https:' ? 'http:' : url.protocol}
                    onChange={(ev, item) => {
                        url.set('protocol', item.key);
                        this.updateUrl(url);
                    }}
                    placeholder={t('editor.picker.type')}
                    onRenderOption={renderOptionWithIcon}
                    onRenderTitle={renderTitleWithIcon}
                    styles={{root:{width: 200}}}
                    options={EndpointTypes.map(({key, icon}) => {
                        return { key: key + ':', text: t('editor.picker.type.' + key), data: {icon} }
                    })}
                />
                {(!url.protocol || url.protocol.indexOf('http') !== 0) &&
                    <Stack.Item grow>{pathField}</Stack.Item>
                }
                {url.protocol && url.protocol.indexOf('http') === 0 &&
                    <Stack.Item grow>
                        <Stack vertical tokens={{childrenGap: 8}} >
                            <Stack.Item>
                                <Stack horizontal tokens={{childrenGap: 8}} >
                                    <Stack.Item>
                                        <Dropdown
                                            selectedKey={createServer ? '__CREATE__' : url.host}
                                            onChange={(ev, item) => {
                                                if(item.key === '__CREATE__'){
                                                    this.setState({createServer: true});
                                                    return;
                                                }
                                                const parsed = parse(item.data.uri, {}, true);
                                                url.set('host', parsed.host);
                                                url.set('protocol', parsed.protocol);
                                                this.updateUrl(url);
                                            }}
                                            placeholder={t('editor.picker.auth')}
                                            options={authValues}
                                        />
                                    </Stack.Item>
                                    {createServer &&
                                        <React.Fragment>
                                            <Stack.Item grow>
                                                <TextField placeholder={"Enter server URL"} value={loginUrl} onChange={(e,v)=>{this.setState({loginUrl: v})}}/>
                                            </Stack.Item>
                                            <Stack.Item>
                                                <PrimaryButton text={"Login"} onClick={() => {this.createAuthority()}} disabled={!loginUrl}/>
                                            </Stack.Item>
                                        </React.Fragment>
                                    }
                                    {url.host && !createServer &&
                                    <Stack.Item grow>
                                        {pathField}
                                    </Stack.Item>
                                    }
                                </Stack>
                            </Stack.Item>
                        </Stack>
                    </Stack.Item>
                }
                <TreeDialog
                    uri={dialog ? rootUrl.toString(): ''}
                    hidden={!dialog}
                    onDismiss={()=>{this.setState({dialog: false})}}
                    initialSelection={selectedPath}
                    onSelect={this.onSelect.bind(this)}
                    unique={true}
                />
            </Stack>
        )
    }

}

EndpointPicker = withTranslation()(EndpointPicker)

export default EndpointPicker
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
            const {loginUrl} = this.state;
            if (loginUrl) {
                // Detect new server in auths list
                const aa = auths.filter((a) => a.uri === loginUrl);
                if(aa.length){
                    this.updateUrl(aa[0].id);
                }
            }
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

    updateUrl(newUrl) {
        const {onChange} = this.props;
        this.setState({
            pathDisabled: this.pathIsDisabled(newUrl),
            createServer: false
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
        // Remove pathname
        const parsed = parse(loginUrl, {}, true);
        parsed.pathname = "";
        onCreateServer(parsed.toString());
    }


    render(){
        const {dialog, pathDisabled, auths, createServer, loginUrl} = this.state;
        const {editType, value, t, invalid} = this.props;
        const url = parse(value, {}, true);
        const rootUrl = parse(value, {}, true);
        const selectedPath = rootUrl.pathname;
        rootUrl.set('pathname', '');
        let loginButtonDisabled = true;
        if(loginUrl) {
            const ll = parse(loginUrl, {}, true);
            if(ll.protocol.indexOf("http") === 0 && ll.host) {
                loginButtonDisabled = false;
            }
        }

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
                errorMessage={invalid?invalid:undefined}
                onClick={() => {this.setState({dialog: true})}}
            />
        );

        const authValues = auths.map(({id, username}) => {
            const parsed = parse(id, {}, true);
            return { key: id, text: `${parsed.host} (${username})`, data:parsed}
        });
        authValues.push({key:'__CREATE__', text:t('server.create.legend')});

        return (
            <React.Fragment>
                <Stack horizontal tokens={{childrenGap: 8}} >
                    {editType &&
                        <Dropdown
                            selectedKey={url.protocol === 'https:' ? 'http:' : url.protocol}
                            onChange={(ev, item) => {
                                url.set('protocol', item.key);
                                url.set('pathname', '');
                                this.updateUrl(url);
                            }}
                            placeholder={t('editor.picker.type')}
                            onRenderOption={renderOptionWithIcon}
                            onRenderTitle={renderTitleWithIcon}
                            styles={{root: {width: 200}}}
                            options={EndpointTypes.map(({key, icon}) => {
                                return {key: key + ':', text: t('editor.picker.type.' + key), data: {icon}}
                            })}
                        />
                    }
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
                                                styles={{root:{minWidth:250}}}
                                                selectedKey={createServer ? '__CREATE__' : url.protocol + '//' + url.username + '@' + url.host}
                                                onChange={(ev, item) => {
                                                    if(item.key === '__CREATE__'){
                                                        url.set('host', '');
                                                        url.set('username', '');
                                                        url.set('pathname', '');
                                                        this.updateUrl(url);
                                                        this.setState({createServer: true});
                                                        return;
                                                    }
                                                    const {protocol, host, username}= item.data;
                                                    url.set('host', host);
                                                    url.set('protocol', protocol);
                                                    url.set('username', username);
                                                    url.set('pathname', '');
                                                    this.updateUrl(url);
                                                }}
                                                placeholder={t('editor.picker.auth')}
                                                options={authValues}
                                            />
                                        </Stack.Item>
                                        {createServer &&
                                            <React.Fragment>
                                                <Stack.Item grow>
                                                    <TextField placeholder={t('server.url.placeholder')} value={loginUrl} onChange={(e,v)=>{this.setState({loginUrl: v})}}/>
                                                </Stack.Item>
                                                <Stack.Item>
                                                    <PrimaryButton text={t('server.login.button')} onClick={() => {this.createAuthority()}} disabled={loginButtonDisabled}/>
                                                </Stack.Item>
                                            </React.Fragment>
                                        }
                                        {!createServer &&
                                        <Stack.Item grow>
                                            {pathField}
                                        </Stack.Item>
                                        }
                                    </Stack>
                                </Stack.Item>
                            </Stack>
                        </Stack.Item>
                    }
                </Stack>
                <TreeDialog
                    uri={dialog ? rootUrl.toString(): ''}
                    allowCreate={true}
                    hidden={!dialog}
                    onDismiss={()=>{this.setState({dialog: false})}}
                    initialSelection={selectedPath}
                    onSelect={this.onSelect.bind(this)}
                    unique={true}
                />
            </React.Fragment>
        )
    }

}

EndpointPicker = withTranslation()(EndpointPicker)

export default EndpointPicker
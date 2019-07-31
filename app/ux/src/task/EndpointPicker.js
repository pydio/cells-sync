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
import {renderOptionWithIcon, renderTitleWithIcon} from "../components/DropdownRender";
import parse from 'url-parse'
import TreeDialog from './TreeDialog'
import {withTranslation} from 'react-i18next'
import EndpointTypes from '../models/EndpointTypes'

class EndpointPicker extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            dialog: false,
            pathDisabled: this.pathIsDisabled(parse(props.value, {}, true)),
        };
    }

    pathIsDisabled(url){
        let pathDisabled = false;
        if(url.protocol && url.protocol.indexOf('http') === 0) {
            pathDisabled = !(url.host && url.username && url.password && url.query && url.query.clientSecret);
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


    render(){
        const {dialog, pathDisabled} = this.state;
        const {value, t} = this.props;
        const url = parse(value, {}, true);
        const rootUrl = parse(value, {}, true);
        const selectedPath = rootUrl.pathname;
        rootUrl.set('pathname', '');

        const query = url.query || {};


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

        return (
            <Stack horizontal tokens={{childrenGap: 8}} >
                <Dropdown
                    selectedKey={url.protocol}
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
                                    <Stack.Item grow>
                                        <TextField
                                            placeholder={t('editor.picker.http.host')}
                                            value={url.host.split(':')[0]}
                                            onChange={(e, v) => {
                                                url.set('host', v);
                                                this.updateUrl(url);
                                            }}/>
                                    </Stack.Item>
                                    <Stack.Item>
                                        <TextField
                                            placeholder={t('editor.picker.http.port')}
                                            value={url.port?url.port:(url.protocol === 'http:' ? 80 : 443)}
                                            onChange={(e, v) => {
                                                url.set('port', v);
                                                this.updateUrl(url);
                                            }}/>
                                    </Stack.Item>
                                </Stack>
                            </Stack.Item>
                            <Stack.Item>
                                <Stack horizontal tokens={{childrenGap: 8}} >
                                    <Stack.Item grow>
                                        <TextField
                                            autoComplete={"off"}
                                            placeholder={t('editor.picker.http.user')}
                                            value={url.username}
                                            onChange={(e, v) => {
                                               url.set('username', v);
                                               this.updateUrl(url);
                                            }}
                                        />
                                    </Stack.Item>
                                    <Stack.Item grow>
                                        <TextField
                                            autoComplete={"off"}
                                            placeholder={t('editor.picker.http.password')}
                                            value={url.password}
                                            onChange={(e, v) => {
                                                url.set('password', v);
                                                this.updateUrl(url);
                                            }}
                                        />
                                    </Stack.Item>
                                    <Stack.Item grow>
                                        <TextField
                                            autoComplete={"off"}
                                            placeholder={t('editor.picker.http.secret')}
                                            value={query.clientSecret}
                                            onChange={(e, v) => {
                                                url.set('query', {clientSecret:v});
                                                this.updateUrl(url);
                                            }}
                                        />
                                    </Stack.Item>
                                </Stack>
                            </Stack.Item>
                            <Stack.Item>{pathField}</Stack.Item>
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
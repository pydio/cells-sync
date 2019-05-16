import React from 'react'
import {Stack} from "office-ui-fabric-react/lib/Stack"
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Dropdown } from 'office-ui-fabric-react/lib/Dropdown';
import {renderOptionWithIcon, renderTitleWithIcon} from "../components/DropdownRender";
import parse from 'url-parse'
import TreeDialog from './TreeDialog'

export default class EndpointPicker extends React.Component {

    constructor(props){
        super(props);
        this.state = {
            dialog: false,
            explicitPort: '',
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
        const explicitPort = (newUrl.protocol === 'http:' && newUrl.port === '80') || (newUrl.protocol === 'https:' && newUrl.port === '443');
        this.setState({
            pathDisabled: this.pathIsDisabled(newUrl),
            explicitPort: explicitPort ? newUrl.port : '',
        });
        onChange(null, newUrl.toString() + (explicitPort?':' + newUrl.port : ''));
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
        const {dialog, pathDisabled, explicitPort} = this.state;
        const {value} = this.props;
        const url = parse(value, {}, true);
        const rootUrl = parse(value, {}, true);
        rootUrl.set('pathname', '');

        const query = url.query || {};


        const pathField = (
            <TextField
                placeholder={"Path (click to select a folder)"}
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
                    placeholder="Endpoint type"
                    onRenderOption={renderOptionWithIcon}
                    onRenderTitle={renderTitleWithIcon}
                    styles={{root:{width: 200}}}
                    options={[
                        { key: 'https:', text: 'Cells Server (SSL)', data: { icon: 'Server' } },
                        { key: 'http:', text: 'Cells Server (Insecure)', data: { icon: 'Server' } },
                        { key: 'router:', text: 'Local Server', data: { icon: 'ServerEnviroment' } },
                        { key: 'fs:', text: 'File system', data: { icon: 'SyncFolder' } },
                        { key: 's3:', text: 'S3 Service', data: { icon: 'SplitObject' } },
                    ]}
                />
                {!url.protocol || url.protocol.indexOf('http') !== 0 &&
                    <Stack.Item grow>{pathField}</Stack.Item>
                }
                {url.protocol && url.protocol.indexOf('http') === 0 &&
                    <Stack.Item grow>
                        <Stack vertical tokens={{childrenGap: 8}} >
                            <Stack.Item>
                                <TextField
                                    placeholder={"Host"}
                                    value={url.host}
                                    onChange={(e, v) => {
                                        url.set('host', v);
                                        this.updateUrl(url);
                                    }}/>
                            </Stack.Item>
                            <Stack.Item>
                                <Stack horizontal tokens={{childrenGap: 8}} >
                                    <Stack.Item grow>
                                        <TextField
                                            autoComplete={"off"}
                                            placeholder={"User name"}
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
                                            placeholder={"User Password"}
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
                                            placeholder={"clientSecret (see pydio.json)"}
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
                    onSelect={this.onSelect.bind(this)}
                />
            </Stack>
        )
    }

}
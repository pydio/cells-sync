import React from 'react'
import {Stack} from "office-ui-fabric-react/lib/Stack"
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { Dropdown } from 'office-ui-fabric-react/lib/Dropdown';
import {renderOptionWithIcon, renderTitleWithIcon} from "../components/DropdownRender";

export default class EndpointPicker extends React.Component {

    parsed(){
        const {value} = this.props;
        let scheme = "", path = "/";
        if (value){
            const parts = value.split('://');
            scheme = parts[0];
            path = parts[1];
        }
        return {scheme, path}
    }

    update(event, value, partType){
        const {onChange} = this.props;
        let parsed = this.parsed();
        let v = value;
        if(partType === 'path' && (value.length === 0 || value[0] !== "/" )){
            v = '/' + value;
        }
        parsed[partType] = v;
        onChange(event, parsed.scheme + '://' + parsed.path);
    }


    render(){
        const {scheme, path} = this.parsed();
        return (
            <Stack horizontal tokens={{childrenGap: 8}} >
                <Dropdown
                    selectedKey={scheme}
                    onChange={(ev, item) => {this.update(ev, item.key, 'scheme')}}
                    placeholder="Endpoint type"
                    onRenderOption={renderOptionWithIcon}
                    onRenderTitle={renderTitleWithIcon}
                    styles={{root:{width: 200}}}
                    options={[
                        { key: 'router', text: 'Local Server', data: { icon: 'ServerEnviroment' } },
                        { key: 'fs', text: 'File system', data: { icon: 'SyncFolder' } },
                        { key: 's3', text: 'S3 Service', data: { icon: 'SplitObject' } },
                    ]}
                />
                <Stack.Item grow>
                    <TextField placeholder={"Path"} value={path} onChange={(e, v) => {this.update(e, v, 'path')}}/>
                </Stack.Item>
            </Stack>
        )
    }

}
import React from 'react'
import {withTranslation} from 'react-i18next'
import {ContextualMenu, DefaultButton, Stack} from "office-ui-fabric-react";

class ActionBar extends React.Component {

    static menuAs(menuProps){
        // Customize contextual menu with menuAs
        return <ContextualMenu {...menuProps} />;
    };

    shouldComponentUpdate(nextProps, nextState) {
        const {LeftConnected, RightConnected, Status} = this.props;
        return LeftConnected !== nextProps.LeftConnected || RightConnected !== nextProps.RightConnected || Status !== nextProps.Status;
    }

    render() {

        const {LeftConnected, RightConnected, Status, triggerAction, t} = this.props;
        console.log('rendering ActionBar', LeftConnected, RightConnected, Status);
        const paused = Status === 1;
        let disabled = !(LeftConnected && RightConnected);
        let loopButton = {key:'loop', disabled: disabled, iconName:'Play'};
        if(Status === 3) {
            loopButton = {key:'interrupt', iconName:'Stop'};
            disabled = true
        }
        const menu = [
            loopButton,
            {key:'resync', disabled: disabled, iconName:'Sync'},
            {key:'more', iconName:'Edit', menu:[
                    { key: 'edit', iconName: 'Edit'},
                    { key: paused ? 'resume' : 'pause', iconName: paused?'PlayResume': 'Pause'},
                    { key: 'delete', iconName: 'Delete' }
                ]},
        ];

        return (
            <Stack horizontal horizontalAlign="end" tokens={{childrenGap:8}} styles={{root:{padding: 10, paddingTop: 20}}}>
                {menu.map(({key,disabled,iconName,menu}) => {
                    const props = {key, disabled, iconProps:{iconName}};
                    if (menu) {
                        props.menuAs = ActionBar.menuAs;
                        props.menuProps = {items: menu.map(({key, iconName}) => {
                                return {key: key, text:t('task.action.'+key), iconProps:{iconName}, onClick:()=>{triggerAction(key)}}
                            })}
                    } else {
                        props.text = t('task.action.'+key);
                        props.onClick = ()=>{triggerAction(key)}
                    }
                    return <DefaultButton {...props}/>
                })}
            </Stack>
        );

    }

}

ActionBar = withTranslation()(ActionBar);
export default ActionBar
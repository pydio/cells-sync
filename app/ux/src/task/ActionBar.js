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
import {withTranslation} from 'react-i18next'
import {ContextualMenu, TooltipHost, TooltipDelay, IconButton, Stack} from "office-ui-fabric-react";

class ActionBar extends React.Component {

    constructor(props) {
        super(props);
        if(props.i18n){
            props.i18n.on("languageChanged", () => {this.forceUpdate()});
        }
    }


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
        const paused = Status === 1;
        let disabled = !(LeftConnected && RightConnected);
        let loopButton = {key:'loop', disabled: disabled, iconName:'Sync'};
        if(Status === 4) { // Error
            loopButton.label = 'task.action.retry'
        } else  if(Status === 3) { // Processing
            loopButton = {key:'interrupt', iconName:'Stop'};
            disabled = true
        }
        const menu = [loopButton];
        if (paused){
            menu.push({ key: paused ? 'resume' : 'pause', iconName: paused?'PlayResume': 'Pause'},)
        }
        menu.push(
            {key:'more', iconName:'MoreVertical', menu:[
                { key:'resync', disabled: disabled, iconName:'SyncToPC'},
                { key: paused ? 'resume' : 'pause', iconName: paused?'PlayResume': 'Pause'},
                { key: 'edit', iconName: 'Edit'},
                { key: 'delete', iconName: 'Delete' }
            ]}
        );
        const buttonStyles = {
            root:{borderRadius: '50%', width: 48, height: 48, backgroundColor: '#F5F5F5', padding: '0 8px;'},
            icon:{fontSize: 24},
            menuIcon:{display:'none'}};

        return (
            <Stack horizontal horizontalAlign="center" tokens={{childrenGap:8}} styles={{root:{padding: 16, paddingTop: 30, paddingBottom: 26}}}>
                {menu.map(({key,disabled,iconName,menu,label}) => {
                    const props = {key, disabled, iconProps:{iconName}};
                    if (menu) {
                        props.menuAs = ActionBar.menuAs;
                        props.text = "More actions...";
                        props.menuProps = {items: menu.map(({key, iconName, label}) => {
                                const txt = label ? t(label) : t('task.action.'+key);
                                return {key: key, text:txt, iconProps:{iconName}, onClick:()=>{triggerAction(key)}}
                            })}
                    } else {
                        props.text = label ? t(label) : t('task.action.'+key);
                        props.onClick = ()=>{triggerAction(key)}
                    }
                    return (
                        <TooltipHost id={"button-" + key} key={key} content={props.text} delay={TooltipDelay.zero}>
                            <IconButton {...props} styles={buttonStyles}/>
                        </TooltipHost>
                    );
                })}
            </Stack>
        );

    }

}

ActionBar = withTranslation()(ActionBar);
export default ActionBar
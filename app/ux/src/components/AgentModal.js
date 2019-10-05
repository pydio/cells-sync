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
import { Dialog, DialogType, DialogFooter, Icon, PrimaryButton } from 'office-ui-fabric-react';

class AgentModal extends React.Component {

    componentDidMount(){
        const {history, socket} = this.props;
        socket.listenExternalRoute((string) => {
            history.push(string);
        });
    }

    render() {

        const {hidden, firstAttempt, connecting, maxAttemptsReached, reconnect, t} = this.props;
        const T = (id) => {
            if(firstAttempt){
                return t('agent.modal.first.' + id)
            } else {
                return t('agent.modal.' + id)
            }
        };

        let dialogText = T('main');
        if(maxAttemptsReached) {
            dialogText += ' ' + T('dead');
        } else {
            dialogText += ' ' + T('wait');
        }
        dialogText = (
            <span>
                <span style={{display:'flex', justifyContent:'center', marginTop:-20}}>
                    <Icon styles={{root:{fontSize: 40, color:'#757575'}}} iconName={"PlugDisconnected"}/>
                </span>
                <span>{dialogText}</span>
            </span>
        );
        return(
            <Dialog
                hidden={hidden}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: T('title'),
                    subText: dialogText
                }}
                modalProps={{
                    isBlocking: true,
                    styles: { main: { maxWidth: 450 } },
                }}
            >
                <DialogFooter>
                    <PrimaryButton
                        onClick={() => {reconnect()}}
                        text={connecting?T('reconnecting'):T('connect')}
                    />
                </DialogFooter>
            </Dialog>

        );

    }
}

AgentModal = withTranslation()(AgentModal);

export default AgentModal
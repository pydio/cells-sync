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
import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { PrimaryButton } from 'office-ui-fabric-react/lib/Button';

class AgentModal extends React.Component {

    componentDidMount(){
        const {history, socket} = this.props;
        socket.listenExternalRoute((string) => {
            history.push(string);
        });
    }

    render() {

        const {hidden, connecting, maxAttemptsReached, reconnect, t} = this.props;
        let dialogText = t('agent.modal.main');
        if(maxAttemptsReached) {
            dialogText += ' ' + t('agent.modal.dead');
        } else {
            dialogText += ' ' + t('agent.modal.wait');
        }
        return(
            <Dialog
                hidden={hidden}
                dialogContentProps={{
                    type: DialogType.normal,
                    title: t('agent.modal.title'),
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
                        text={connecting?t('agent.modal.reconnecting'):t('agent.modal.connect')}
                    />
                </DialogFooter>
            </Dialog>

        );

    }
}

AgentModal = withTranslation()(AgentModal);

export default AgentModal
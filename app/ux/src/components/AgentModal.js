import React from 'react'
import {withTranslation} from 'react-i18next'
import { Dialog, DialogType, DialogFooter } from 'office-ui-fabric-react/lib/Dialog';
import { PrimaryButton } from 'office-ui-fabric-react/lib/Button';

class AgentModal extends React.Component {

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
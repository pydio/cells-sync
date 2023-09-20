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
import {
    PrimaryButton,
    DefaultButton,
    Dialog,
    DialogFooter,
    DialogType,
} from "office-ui-fabric-react";
import {withTranslation} from 'react-i18next'

class ConfirmDialog extends React.Component {

    render() {
        const {open = false, title, sentence, confirmLabel, onDismiss, onConfirm, t, destructive=false, alertOnly=false} = this.props

        let buttons = []
        if (alertOnly) {
            buttons.push(
                <PrimaryButton onClick={onDismiss} text={t('button.close')}/>,
            )
        } else {
            buttons.push(
                <DefaultButton key={"cancel"} onClick={onDismiss} text={t('button.cancel')}/>,
                <PrimaryButton key={"confirm"} onClick={onConfirm} text={confirmLabel} style={destructive?{backgroundColor:'#d32f2f'}:null}/>
            )
        }

        return (
            <Dialog hidden={!open} onDismiss={onDismiss} dialogContentProps={{type:DialogType.normal, title:title, subText:sentence}}>
                <DialogFooter>{buttons}</DialogFooter>
            </Dialog>
        )

    }
}

ConfirmDialog = withTranslation()(ConfirmDialog);
export {ConfirmDialog as default}
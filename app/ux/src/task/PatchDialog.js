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
    Dialog,
    DialogFooter,
    DialogContent,
} from "office-ui-fabric-react";
import {withTranslation} from 'react-i18next'
import {load} from '../models/Patch'
import PatchActivities from './PatchActivities'

const listSize = 5;

class PatchDialog extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            patches:[],
            loading: true,
            first: true,
            hasMore: true,
            offset: 0
        }
    }

    componentWillReceiveProps(nextProps){
        const {syncConfig} = nextProps;
        if (syncConfig && (!this.props.syncConfig || syncConfig.Uuid !== this.props.syncConfig.Uuid)) {
            this.setState({loading:true, first: true, offset: 0});
            load(syncConfig, 0, listSize).then(patches => {
                if(patches){
                    patches.reverse();
                }
                this.setState({patches, loading: false, hasMore:(patches && patches.length === listSize)});
            }).catch(() => {
                this.setState({loading: false});
            });
        }
    }

    loadMore(){
        let {offset} = this.state;
        const {syncConfig} = this.props;
        this.setState({loading:true});
        load(syncConfig, offset + listSize, listSize).then(patches => {
            this.setState({offset: offset + listSize, loading: false});
            if(!patches || patches.length < listSize){
                this.setState({hasMore: false});
            }
            if(patches) {
                patches.reverse();
                this.setState({patches: [...this.state.patches, ...patches], loading: false});
            }
        }).catch(() => {
            this.setState({loading: false});
        });
    }

    render() {
        const {onDismiss, t, openPath, ...dialogProps} = this.props;
        const {patches, loading, hasMore} = this.state;
        return (
            <Dialog {...dialogProps} onDismiss={onDismiss} minWidth={700} title={t('patch.title')} modalProps={{...dialogProps.modalProps,isBlocking: false}}>
                <DialogContent styles={{innerContent:{minHeight: 350}, inner:{padding:0}, title:{display:'none'}}}>
                    <PatchActivities
                        patches={patches}
                        loading={loading}
                        openPath={openPath}
                        loadMore={hasMore?this.loadMore.bind(this):null}
                    />
                </DialogContent>
                <DialogFooter>
                    <PrimaryButton onClick={onDismiss} text={t('button.close')}/>
                </DialogFooter>
            </Dialog>
        );
    }

}

PatchDialog = withTranslation()(PatchDialog);
export {PatchDialog as default}
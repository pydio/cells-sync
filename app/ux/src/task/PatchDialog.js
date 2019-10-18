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
import {ScrollablePane, PrimaryButton, Spinner, SpinnerSize, Dialog, DialogFooter, DialogContent, Sticky, StickyPositionType, Link} from "office-ui-fabric-react";
import {withTranslation} from 'react-i18next'
import {load} from '../models/Patch'
import PatchNode from "./PatchNode";

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
        const {syncUUID} = nextProps;
        if (syncUUID && syncUUID !== this.props.syncUUID) {
            this.setState({loading:true, first: true, offset: 0});
            load(syncUUID, 0, listSize).then(patches => {
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
        const {syncUUID} = this.props;
        this.setState({loading:true});
        load(syncUUID, offset + listSize, listSize).then(patches => {
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
                    <ScrollablePane styles={{contentContainer:{maxHeight:350, backgroundColor:'#fafafa'}}}>
                        <Sticky stickyPosition={StickyPositionType.Header}>
                            <div style={{borderBottom: '1px solid #EEEEEE', backgroundColor: '#F5F5F5', fontFamily: 'Roboto Medium', display:'flex', alignItems:'center', padding:'8px 0'}}>
                                <span style={{flex: 1, paddingLeft: 8}}>{t('patch.header.nodes')}</span>
                                <span style={{width: 130, marginRight: 8, textAlign:'center'}}>{t('patch.header.operations')}</span>
                            </div>
                        </Sticky>
                        {patches &&
                            patches.map((patch, k) => {
                                return (
                                    <div key={k} style={{paddingBottom: 2, borderTop: k > 0 ? '1px solid #e0e0e0' : null}}>
                                        <PatchNode patch={patch.Root} stats={patch.Stats} level={0} open={k === 0} openPath={openPath}/>
                                    </div>
                                );
                            })
                        }
                        {!loading && hasMore &&
                            <div style={{padding: 10, textAlign:'center'}}><Link onClick={() => {this.loadMore()}}>{t('patch.more.load')}</Link></div>
                        }
                        {loading &&
                        <div style={{height:(patches && patches.length?50:400), display:'flex', alignItems:'center', justifyContent:'center'}}>
                            <Spinner size={SpinnerSize.large} />
                        </div>
                        }
                    </ScrollablePane>
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
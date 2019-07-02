import React from 'react'
import {ScrollablePane, PrimaryButton, Spinner, SpinnerSize, Dialog, DialogFooter, DialogContent, Sticky, StickyPositionType, Link} from "office-ui-fabric-react";
import {withTranslation} from 'react-i18next'
import {load} from '../models/Patch'
import PatchNode from "./PatchNode";

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
            load(syncUUID, 0, 10).then(patches => {
                this.setState({patches, loading: false, hasMore:(patches && patches.length === 10)});
            });
        }
    }

    loadMore(){
        let {offset} = this.state;
        const {syncUUID} = this.props;
        load(syncUUID, offset + 10, 10).then(patches => {
            this.setState({offset: offset + 10});
            if(!patches || patches.length < 10){
                this.setState({hasMore: false});
            }
            if(patches) {
                this.setState({patches: [...this.state.patches, ...patches], loading: false});
            }
        });
    }

    render() {
        const {onDismiss, t, ...dialogProps} = this.props;
        const {patches, loading, hasMore} = this.state;
        if(patches){
            patches.reverse();
        }
        return (
            <Dialog {...dialogProps} onDismiss={onDismiss} minWidth={700} title={t('patch.title')} modalProps={{...dialogProps.modalProps,isBlocking: false}}>
                <DialogContent styles={{innerContent:{minHeight: 400}, inner:{padding:0}, title:{display:'none'}}}>
                    <ScrollablePane styles={{contentContainer:{maxHeight:400, backgroundColor:'#fafafa'}}}>
                        <Sticky stickyPosition={StickyPositionType.Header}>
                            <div style={{borderBottom: '1px solid #EEEEEE', backgroundColor: '#F5F5F5', fontWeight: 'bold', display:'flex', alignItems:'center', padding:'8px 0'}}>
                                <span style={{flex: 1, paddingLeft: 8}}>Files / Folders</span>
                                <span style={{width: 130, marginRight: 8, textAlign:'center'}}>Operations</span>
                            </div>
                        </Sticky>
                        {loading &&
                            <div style={{height:400, display:'flex', alignItems:'center', justifyContent:'center'}}>
                                <Spinner size={SpinnerSize.large} />
                            </div>
                        }
                        {patches &&
                            patches.map((patch, k) => {
                                return (
                                    <div key={k} style={{paddingBottom: 2, borderTop: k > 0 ? '1px solid #e0e0e0' : null}}>
                                        <PatchNode patch={patch.Root} stats={patch.Stats} level={0} open={k === 0}/>
                                    </div>
                                );
                            })
                        }
                        {!loading && hasMore &&
                            <div style={{padding: 10, textAlign:'center'}}><Link onClick={() => {this.loadMore()}}>Load more...</Link></div>
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
import React from 'react'
import {ScrollablePane, PrimaryButton, Spinner, SpinnerSize, Dialog, DialogFooter, DialogContent} from "office-ui-fabric-react";
import {withTranslation} from 'react-i18next'
import {load, Patch} from '../models/Patch'
import moment from 'moment'
import PatchNode from "./PatchNode";

class PatchDialog extends React.Component {

    constructor(props) {
        super(props);
        this.state = {patches:[], loading: true}
    }

    componentWillReceiveProps(nextProps){
        const {syncUUID} = nextProps;
        if (syncUUID) {
            this.setState({loading:true});
            load(syncUUID, 0, 1).then(patches => {
                this.setState({patches, loading: false});
            });
        }
    }

    render() {
        const {onDismiss, t, ...dialogProps} = this.props;
        const {patches, loading} = this.state;
        const [patch] = patches;
        console.log(patch);
        return (
            <Dialog {...dialogProps} onDismiss={onDismiss} minWidth={700} title={t('patch.title')} modalProps={{...dialogProps.modalProps,isBlocking: false}}>
                <DialogContent styles={{innerContent:{minHeight: 400}, inner:{padding:0}, title:{display:'none'}}}>
                    <ScrollablePane styles={{contentContainer:{maxHeight:400, backgroundColor:'#fafafa', paddingRight: 20}}}>
                        {loading &&
                            <div style={{height:400, display:'flex', alignItems:'center', justifyContent:'center'}}>
                                <Spinner size={SpinnerSize.large} />
                            </div>
                        }
                        {patch &&
                            <PatchNode patch={patch} level={0}/>
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
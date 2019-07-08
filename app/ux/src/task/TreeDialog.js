import React from 'react'
import { Dialog, DialogFooter, DialogContent } from 'office-ui-fabric-react/lib/Dialog';
import TreeView from "./TreeView";
import {PrimaryButton, DefaultButton} from "office-ui-fabric-react";
import {ScrollablePane} from 'office-ui-fabric-react/lib/ScrollablePane'
import {withTranslation} from 'react-i18next'

class TreeDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {selection:[]}
    }

    submit(){
        const {selection} = this.state;
        const {initialSelection} = this.props;
        if((!selection || !selection.length) && !initialSelection) {
            window.alert('Please pick a folder')
        } else if(selection) {
            this.props.onSelect(selection);
            this.props.onDismiss();
        } else {
            this.props.onSelect(initialSelection);
            this.props.onDismiss();
        }
    }

    render() {
        const {uri, t, initialSelection, unique, ...dialogProps} = this.props;
        return (
            <Dialog {...dialogProps} minWidth={700} title={t('tree.title')} modalProps={{...dialogProps.modalProps,isBlocking: false}}>
                <DialogContent styles={{innerContent:{minHeight: 400}, inner:{padding:0}, title:{display:'none'}}}>
                    <ScrollablePane styles={{contentContainer:{maxHeight:400, backgroundColor:'#fafafa'}}}>
                        {uri &&
                            <TreeView
                                unique={unique}
                                uri={uri}
                                initialSelection={initialSelection}
                                onSelectionChanged={(sel) => {this.setState({selection: sel})}}
                            />
                        }
                    </ScrollablePane>
                </DialogContent>
                <DialogFooter>
                    <DefaultButton onClick={this.props.onDismiss} text={t('button.cancel')}/>
                    <PrimaryButton onClick={this.submit.bind(this)} text={t('button.select')}/>
                </DialogFooter>
            </Dialog>
        );
    }

}

TreeDialog = withTranslation()(TreeDialog);
export {TreeDialog as default}
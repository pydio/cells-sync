import React from 'react'
import { Dialog, DialogFooter, DialogContent } from 'office-ui-fabric-react/lib/Dialog';
import TreeView from "./TreeView";
import {PrimaryButton, DefaultButton} from "office-ui-fabric-react";
import {ScrollablePane} from 'office-ui-fabric-react/lib/ScrollablePane'

class TreeDialog extends React.Component {
    constructor(props) {
        super(props);
        this.state = {selection:[]}
    }

    submit(){
        const {selection} = this.state;
        if(!selection || !selection.length) {
            window.alert('Please pick a folder')
        } else {
            console.log(selection);
            this.props.onSelect(selection);
            this.props.onDismiss();
        }
    }

    render() {
        const {uri, ...dialogProps} = this.props;
        return (
            <Dialog {...dialogProps} modalProps={{
                ...dialogProps.modalProps,
                isBlocking: true,
                styles: { main: { maxWidth: 450 } },
            }}>
                <DialogContent title={"Pick a Folder"}>
                    <TreeView uri={uri} onSelectionChanged={(sel) => {this.setState({selection: sel})}}/>
                </DialogContent>
                <DialogFooter>
                    <DefaultButton onClick={this.props.onDismiss} text={"Cancel"}/>
                    <PrimaryButton onClick={this.submit.bind(this)} text={"Select"}/>
                </DialogFooter>
            </Dialog>
        );
    }

}

export {TreeDialog as default}
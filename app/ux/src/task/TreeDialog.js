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
            <Dialog {...dialogProps} minWidth={650} title={"Pick a folder"} modalProps={{...dialogProps.modalProps,isBlocking: false}}>
                <DialogContent styles={{innerContent:{minHeight: 450}, inner:{padding:0}, title:{display:'none'}}}>
                    <ScrollablePane styles={{contentContainer:{maxHeight:450, backgroundColor:'#fafafa'}}}>
                        {uri &&
                            <TreeView uri={uri} onSelectionChanged={(sel) => {this.setState({selection: sel})}}/>
                        }
                    </ScrollablePane>
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
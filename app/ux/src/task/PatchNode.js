import React from 'react'
import {Icon} from 'office-ui-fabric-react'
import moment from 'moment'

const ops = {
    0: 'Transfer File',
    1: 'Update File',
    2: 'Create Folder',
    3: 'Move Folder',
    4: 'Move File',
    5: 'Delete'
};

class PatchNode extends React.Component {
    constructor(props) {
        super(props);
        const {level} = props;
        this.state = {open: level === 0};
    }

    render(){
        const {patch, level} = this.props;
        const {open} = this.state;
        const isLeaf = patch.Node.Type === 1;
        let action;
        if (patch.PathOperation){
            action = ops[patch.PathOperation.OpType];
        } else if(patch.DataOperation) {
            action = ops[patch.DataOperation.OpType];
        }
        let icon;
        if(patch.Stamp){
            icon = 'FolderList'
        } else if(isLeaf){
            icon = 'OpenFile'
        } else{
            icon = 'FabricFolder'
        }
        return (
            <div style={{paddingLeft:(level > 0 ? 20 : 0)}}>
                <div onClick={()=>{this.setState({open:!open})}} style={{display:'flex', alignItems:'center', fontSize:15, paddingTop: 8, paddingBottom: 8}}>
                    {!isLeaf &&
                        <Icon iconName={open ? 'ChevronDown' : 'ChevronRight'} styles={{root:{margin:'0 5px', cursor: 'pointer'}}}/>
                    }
                    {isLeaf &&
                        <span style={{width: 25}}>&nbsp;</span>
                    }
                    <Icon iconName={icon} styles={{root:{margin:'0 5px'}}}/>
                    <span style={{flex: 1}}>{patch.Stamp ? moment(patch.Stamp).fromNow() : patch.Base}</span>
                    <span style={{fontSize: 12}}>{action}</span>
                </div>
                <div style={{display:(open?'block':'none')}} >{patch.Children.map((child) => {
                    return <PatchNode key={child.Base} patch={child} level={level + 1}/>
                })}</div>
            </div>
        );
    }

}

export default PatchNode
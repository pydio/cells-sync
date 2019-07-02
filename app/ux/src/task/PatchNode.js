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
        const {open} = props;
        this.state = {open};
    }

    render(){
        const {patch, level, stats} = this.props;
        const {open} = this.state;
        if(!patch.PathOperation && !patch.DataOperation && !patch.Children.length){
            return null;
        }
        const isLeaf = patch.Node.Type === 1;
        let icon;
        if(patch.Stamp){
            icon = 'FolderList'
        } else if(isLeaf){
            icon = 'Page'
        } else{
            icon = 'FolderOpen'
        }
        let action;
        if (patch.PathOperation){
            action = ops[patch.PathOperation.OpType];
            if (patch.PathOperation.OpType === 5) {
                icon = 'Delete'
            }
        } else if(patch.DataOperation) {
            action = ops[patch.DataOperation.OpType];
        } else if (stats && stats.Processed) {
            action = '[' + stats.Processed.Total + ']';
        }
        return (
            <div style={{paddingLeft:(level > 0 ? 20 : 0)}}>
                <div onClick={()=>{this.setState({open:!open})}} style={{display:'flex', alignItems:'center', fontSize:15, paddingTop: 8, paddingBottom: 8}}>
                    {!isLeaf &&
                        <Icon iconName={open ? 'ChevronDown' : 'ChevronRight'} styles={{root:{margin:'0 5px', cursor: 'pointer', color:'#9e9e9e'}}}/>
                    }
                    {isLeaf &&
                        <span style={{width: 25}}>&nbsp;</span>
                    }
                    <Icon iconName={icon} styles={{root:{margin:'0 5px'}}}/>
                    <span style={{flex: 1}}>{patch.Stamp ? moment(patch.Stamp).fromNow() : patch.Base}</span>
                    <span style={{width: 130, marginRight: 8, fontSize: 12, textAlign:'center'}}>{action}</span>
                </div>
                <div style={{display:(open?'block':'none')}} >{patch.Children.map((child) => {
                    return <PatchNode key={child.Base} patch={child} level={level + 1}/>
                })}</div>
            </div>
        );
    }

}

export default PatchNode
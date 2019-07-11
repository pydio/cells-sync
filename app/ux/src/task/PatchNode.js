import React from 'react'
import {Icon, TooltipHost} from 'office-ui-fabric-react'
import moment from 'moment'
import basename from 'basename'

const ops = {
    0: 'Transfer File',
    1: 'Update File',
    2: 'Create Folder',
    3: 'Move Folder',
    4: 'Move File',
    5: 'Delete',
    7: 'Conflict'
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
        if(!patch.hasOperations()){
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
                icon = 'Delete';
            } else if(patch.PathOperation.OpType === 2) {
                icon = 'NewFolder'
            } else if(patch.PathOperation.OpType === 3) {
                icon = 'MoveToFolder'
            }
            if (patch.PathOperation.ErrorString){
                action += <TooltipHost content={patch.PathOperation.ErrorString}><Icon iconName={"Warning"}/> {action}</TooltipHost>
            }
        } else if(patch.DataOperation) {
            action = ops[patch.DataOperation.OpType];
            if (patch.DataOperation.ErrorString){
                action = <TooltipHost content={patch.DataOperation.ErrorString}><Icon iconName={"Warning"}/> {action}</TooltipHost>
            }
        } else if(patch.Conflict) {
            action = ops[patch.Conflict.OpType];
            icon = 'Warning'
        }
        let children = patch.Children;
        let hasMore = false;
        if (children.length > 20) {
            hasMore = children.length;
            children = children.slice(0, 20);
        }
        let label = patch.Stamp ? moment(patch.Stamp).fromNow() : patch.Base;
        if (stats) {
            if(stats.Errors){
                label +=  ' (' + stats.Errors.Total + ' errors)';
            } else if (stats.Processed){
                label +=  ' (' + stats.Processed.Total + ')';
            }
        }
        if (patch.MoveTargetPath){
            let target = basename(patch.MoveTargetPath);
            if(target === patch.Base) {
                target = '/' + patch.MoveTargetPath
            } else {
                target = './' + target
            }
            label += " => " + target;
        }
        return (
            <div style={{paddingLeft:(level > 0 ? 20 : 0)}}>
                <div onClick={()=>{this.setState({open:!open})}} style={{display:'flex', alignItems:'center', fontSize:15, paddingTop: 8, paddingBottom: 8}}>
                    {!isLeaf && children.length > 0 &&
                        <Icon iconName={open ? 'ChevronDown' : 'ChevronRight'} styles={{root:{margin:'0 5px', cursor: 'pointer', color:'#9e9e9e'}}}/>
                    }
                    {(isLeaf || !children.length) &&
                        <span style={{width: 25}}>&nbsp;</span>
                    }
                    <Icon iconName={icon} styles={{root:{margin:'0 5px'}}}/>
                    <span style={{flex: 1}}>{label}</span>
                    <span style={{width: 130, marginRight: 8, fontSize: 12, textAlign:'center'}}>{action}</span>
                </div>
                {open &&
                    <div>
                        {children.map((child) => {
                            return <PatchNode key={child.Base} patch={child} level={level + 1}/>
                        })}
                        {hasMore > 0 && <div style={{padding: 5, paddingLeft: 50, fontStyle: 'italic', color: '#757575'}}>...showing 20 out of {hasMore} operations.</div>}
                    </div>
                }
            </div>
        );
    }

}

export default PatchNode
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
import {Icon, TooltipHost, Link} from 'office-ui-fabric-react'
import moment from 'moment'
import basename from 'basename'
import {withTranslation} from 'react-i18next'
import Colors from "../components/Colors";

const ops = {
    0: 'transfer',
    1: 'update',
    2: 'mkdir',
    3: 'mvdir',
    4: 'mvfile',
    5: 'delete',
    7: 'conflict'
};

class PatchNode extends React.Component {
    constructor(props) {
        super(props);
        const {open, flatMode} = props;
        this.state = {open: open || flatMode};
    }

    render(){
        const {patch, patchError, level, stats, openPath, t, flatMode} = this.props;
        const {open} = this.state;
        if(!patch.hasOperations() && !patchError){
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
        let direction;
        if (patch.PathOperation){
            direction = patch.PathOperation.Dir;
            action = t('patch.operation.' + ops[patch.PathOperation.OpType]);
            if (patch.PathOperation.OpType === 5) {
                icon = 'Delete';
            } else if(patch.PathOperation.OpType === 2) {
                icon = 'NewFolder'
            } else if(patch.PathOperation.OpType === 3) {
                icon = 'MoveToFolder'
            }
            if (patch.PathOperation.ErrorString){
                action = <TooltipHost content={patch.PathOperation.ErrorString}><Icon iconName={"Warning"}/> {action}</TooltipHost>
            }
        } else if(patch.DataOperation) {
            direction = patch.DataOperation.Dir;
            action = t('patch.operation.' + ops[patch.DataOperation.OpType]);
            if (patch.DataOperation.ErrorString){
                action = <TooltipHost content={patch.DataOperation.ErrorString}><Icon iconName={"Warning"} styles={{root:{color:Colors.error}}}/> <span style={{color:Colors.error}}>{action}</span></TooltipHost>
            }
        } else if(patch.Conflict) {
            action = t('patch.operation.' + ops[patch.Conflict.OpType]);
            icon = 'Warning'
        }
        let children = patch.Children;
        let hasMore = false;
        if (children.length > 20) {
            hasMore = children.length;
            children = children.slice(0, 20);
        }
        const fullPath = flatMode && !(patch.PathOperation || patch.DataOperation) ? patch.Node.Path : patch.Base;
        let label = patch.Stamp ? moment(patch.Stamp).fromNow() : fullPath;
        if (stats) {
            if(stats.Errors){
                label +=  ' (' + stats.Errors.Total + ' '+t('patch.errors.' + (stats.Errors.Total > 1 ? 'multiple': 'one'))+')';
            } else if (stats.Processed){
                label +=  ' (' + stats.Processed.Total + ')';
            }
        }
        if (patchError) {
            label = <span>{label} : <span style={{color:Colors.error}}>{patchError}</span></span>;
        }
        if (patch.MoveTargetPath){
            let target
            let base = basename(patch.MoveTargetPath);
            let dir = patch.MoveTargetPath.replace(`${base}$`, '')
            if(base === basename(patch.Node.Path)){
                target = dir
            } else {
                target = base
            }
            label = <span>{label} &rarr; {target}</span>;
        }
        let openLink;
        if(openPath && patch.Node && patch.Node.Path && ( patch.DataOperation || patch.PathOperation) ){
            openLink = patch.Node.Path;
            if(patch.PathOperation && patch.PathOperation.OpType === 5) {
                openLink = null;
            } else if(patch.MoveTargetPath) {
                openLink = patch.MoveTargetPath;
            }
        }
        let hideMain = false;
        let paddingLeft = (level > 0 ? 20 : 0)
        let newLevel = level + 1
        if(flatMode && patch.Base !== "." && !(patch.PathOperation || patch.DataOperation || patchError) && patch.Children) {
            hideMain = patch.Children.filter((c) => c.PathOperation || c.DataOperation).length === 0
            if (hideMain){
                newLevel = level > 0 ? level -1  : level;
            }
        }
        // console.log(hideMain, patchError, level, newLevel);
        return (
            <div style={{paddingLeft}}>
                {!hideMain &&
                    <div onClick={()=>{this.setState({open:!open})}} style={{display:'flex', alignItems:'center', fontSize:15, paddingTop: 8, paddingBottom: 8}}>
                        {!isLeaf && children.length > 0 &&
                        <Icon iconName={open ? 'ChevronDown' : 'ChevronRight'} styles={{root:{margin:'0 5px', cursor: 'pointer', color:'#9e9e9e', fontSize:'1.2em', height:19}}}/>
                        }
                        {level === 0 && !children.length &&
                        <Icon iconName={'ChevronRight'} styles={{root:{margin:'0 5px', color:'#9e9e9e', fontSize:'1.2em', height:19}}}/>
                        }
                        {(isLeaf || !children.length) && level > 0 &&
                        <span style={{width: 25}}>&nbsp;</span>
                        }
                        <Icon iconName={icon} styles={{root:{margin:'0 5px', fontSize:'1.2em', height:19}}}/>
                        {openLink && <Link styles={{root:{flex: 1}}} onClick={()=>{openPath(openLink)}}>{label}</Link>}
                        {!openLink && <span style={{flex: 1}}>{label}</span>}
                        {action &&
                        <span style={{width: 130, marginRight: 8, fontSize: 12, textAlign:'center'}}>
                            {direction !== undefined && <Icon iconName={direction === 0?'ArrowDown':'ArrowUp'} styles={{root:{height: 11,overflow: 'hidden', marginRight: 2}}}/>}
                            {action}
                        </span>
                        }
                    </div>
                }
                {open &&
                    <div>
                        {children.map((child) => {
                            return <PatchNode key={child.Base} patch={child} level={newLevel} openPath={openPath} t={t} flatMode={flatMode}/>
                        })}
                        {hasMore > 0 && <div style={{padding: 5, paddingLeft: 50, fontStyle: 'italic', color: '#757575'}}>{t('patch.more.limit').replace('%s', hasMore)}.</div>}
                    </div>
                }
            </div>
        );
    }

}

PatchNode = withTranslation()(PatchNode);
export default PatchNode
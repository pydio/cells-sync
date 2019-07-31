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
        const {open} = props;
        this.state = {open};
    }

    render(){
        const {patch, level, stats, openPath, t} = this.props;
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
            action = t('patch.operation.' + ops[patch.DataOperation.OpType]);
            if (patch.DataOperation.ErrorString){
                action = <TooltipHost content={patch.DataOperation.ErrorString}><Icon iconName={"Warning"}/> {action}</TooltipHost>
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
        let label = patch.Stamp ? moment(patch.Stamp).fromNow() : patch.Base;
        if (stats) {
            if(stats.Errors){
                label +=  ' (' + stats.Errors.Total + ' '+t('patch.errors.' + (stats.Errors.Total > 1 ? 'multiple': 'one'))+')';
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
                    {openLink && <Link styles={{root:{flex: 1}}} onClick={()=>{openPath(openLink)}}>{label}</Link>}
                    {!openLink && <span style={{flex: 1}}>{label}</span>}
                    <span style={{width: 130, marginRight: 8, fontSize: 12, textAlign:'center'}}>{action}</span>
                </div>
                {open &&
                    <div>
                        {children.map((child) => {
                            return <PatchNode key={child.Base} patch={child} level={level + 1} openPath={openPath} t={t}/>
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
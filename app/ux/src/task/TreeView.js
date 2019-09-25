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
import * as React from 'react';
import { GroupedList, GroupHeader, FocusZone, Selection, SelectionMode, SelectionZone, Icon, IconButton, TextField } from 'office-ui-fabric-react';
import {TreeNode, Loader} from "../models/TreeNode";
import {withTranslation} from 'react-i18next'

class TreeView extends React.Component {

    constructor(props) {
        super(props);
        const {unique, t} = props;
        let label = t('tree.root.select.multiple');
        if(unique){
            label = t('tree.root.select.unique');
        }
        const loader = new Loader(label, props.uri, props.allowCreate);
        const {initialSelection} = this.props;
        const selection = new Selection({onSelectionChanged:()=>{
            this.setState({selection: selection}, () => {
                const selectedPaths = this.filterSelection();
                if(selectedPaths.indexOf(initialSelection) > -1){
                    this.setState({initialSelectionPath: null});
                }
                this.props.onSelectionChanged(selectedPaths);
            });
        }});
        const tree = new TreeNode("/", loader, null, ()=>{
            let items = [], groups = [];
            this.nodesToGroups(items, groups, tree);
            const {selection, initialSelectionPath} = this.state;
            const crtSel = selection.getSelection();
            selection.setItems(items);
            if(initialSelectionPath !== '' && crtSel.length === 0) {
                for (let i = 0; i < items.length; i++) {
                    let compKey = items[i].key;
                    if(compKey.length > 0 && compKey[0] !== "/"){
                        compKey = "/" + compKey
                    }
                    console.log('comparing', initialSelectionPath, compKey)
                    if (initialSelectionPath === compKey) {
                        selection.setIndexSelected(i, true, true);
                    }
                }
            }
            crtSel.forEach(s => {
                selection.setKeySelected(s.key, true, true);
            });
            setTimeout(() => {this.forceUpdate()}, 0);
        });
        this.state = {
            tree,
            items:[],
            groups:[], selection, initialSelectionPath: initialSelection};
        selection.setItems([]);
    }

    nodesToGroups(items, groups, node, level = 0, startIndex = 0) {
        items.push({key:node.getPath(), name:node.getPath()});
        let totalChildren = 0;
        node.walk(()=>{totalChildren++});
        const group = {
            count: totalChildren,
            key: node.getPath(),
            name: node.getName(),
            startIndex: startIndex,
            level: level,
            node: node,
            isCollapsed: node.isCollapsed(),
            children: []
        };
        groups.push(group);
        node.getChildren().forEach(child => {
            startIndex = this.nodesToGroups(items, group.children, child, level + 1, startIndex + 1);
        });
        return startIndex
    }

    filterSelection(){
        const {selection} = this.state;
        if(selection.isIndexSelected(0)){
            selection.setAllSelected(false);
            this.forceUpdate();
        }
        const selected = selection.getSelection() || [];
        //console.log(selected);
        return selected.map(item => {
            let k = item.key;
            if(k.length && k[0] !== '/') {
                k = '/' + k;
            }
            return k;
        });
    }


    componentDidMount(){
        const {tree} = this.state;
        const {initialSelection, onError} = this.props;
        onError(null);
        tree.load(initialSelection).catch(e => {
            onError(e);
        });
    }

    onRenderGroup(data){
        const {onToggleCollapse, onToggleSelectGroup, styles, ...all} = data;
        const {unique, onError, t} = this.props;
        const {selection} = this.state;

        const toggleSelectGroup = (group) => {
            if(group.node.name === TreeNode.CREATE_FOLDER){
                return;
            }
            if(unique){
                selection.setAllSelected(false);
            }
            onToggleSelectGroup(group);
        };

        const toggleCollapse = (group) => {
            if(group.node.name === TreeNode.CREATE_FOLDER){
                return;
            }
            onToggleCollapse(group);
            if (!group.isCollapsed && !group.node.isLoaded()) {
                group.node.load();
            }
            group.node.setCollapsed(group.isCollapsed);
        };
        const isGroupLoading = (group) => group.node.isLoading();

        const hStyles = {
            ...styles,
            headerCount:{display:'none'},
            title:{marginRight: 10},
        };
        if(data.group.startIndex === 0){
            //hStyles.check = {visibility:'hidden'};
        }
        let expandProps = {};
        if(data.group.name === TreeNode.CREATE_FOLDER){
            expandProps.style = {display:'none'};
        }

        const onNewFolder = (group, newName) => {
            if(newName){
                group.node.parent.createChildFolder(newName).catch((e) => {
                    onError(e);
                });
            }
        };

        return <GroupHeader
            {...all}
            styles={hStyles}
            isGroupLoading={isGroupLoading}
            onToggleCollapse={toggleCollapse}
            onToggleSelectGroup={toggleSelectGroup}
            expandButtonProps={expandProps}
            onRenderTitle={({group})=> {
                if(group.name === TreeNode.CREATE_FOLDER) {
                    return <FolderPrompt onFinish={(newName) => onNewFolder(group, newName)}/>
                }else{
                    return <div>{group.name}</div>
                }
            }}
        />
    }

    render(){

        const {tree, selection} = this.state;
        let items = [], groups = [];
        this.nodesToGroups(items, groups, tree);

        return (
            <div>
                <FocusZone>
                    <SelectionZone selection={selection} selectionMode={SelectionMode.single}>
                        <GroupedList
                            items={[]}
                            selection={selection}
                            selectionMode={SelectionMode.multiple}
                            groups={groups}
                            groupProps={{showEmptyGroups:true, onRenderHeader:this.onRenderGroup.bind(this)}}
                            compact={true}
                            onRenderCell={()=>{return null}}
                        />
                    </SelectionZone>
                </FocusZone>
            </div>
        );
    }

}

class FolderPrompt extends React.Component{
    constructor(props){
        super(props);
        this.state = {open: false, value: ""};
    }
    render(){
        const {t, onFinish} = this.props;
        const {open, value} = this.state;
        let content;
        if(open){
            content = (
                <React.Fragment>
                    <TextField autoFocus={true} placeholder={t('tree.create.folder.placeholder')} value={value} onChange={(e,v)=>{this.setState({value: v})}}/>
                    <IconButton iconProps={{iconName:'CheckMark'}} onClick={() => {onFinish(value); this.setState({open: false, value: ""})}}/>
                    <IconButton iconProps={{iconName:'Cancel'}} onClick={() => {this.setState({open: false})}}/>
                </React.Fragment>
            );
        } else {
            content = t('tree.create.folder');
        }
        return (
            <div style={{color: '#0078d4',cursor: 'pointer', display:'flex', alignItems:'center'}} onClick={()=>{if(!open) this.setState({open: true})}}>
                <Icon iconName={"NewFolder"} styles={{root:{margin:'0 8px'}}}/>{content}
            </div>
        )
    }
}

FolderPrompt = withTranslation()(FolderPrompt);
TreeView = withTranslation()(TreeView);
export {TreeView as default}
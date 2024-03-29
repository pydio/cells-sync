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
import { GroupedList, GroupHeader, FocusZone, Selection, SelectionMode, SelectionZone, Icon, IconButton, TextField, Spinner, SpinnerSize } from 'office-ui-fabric-react';
import {TreeNode, Loader} from "../models/TreeNode";
import {withTranslation} from 'react-i18next'
import {parseUri} from "../models/EndpointTypes";

class TreeView extends React.Component {

    constructor(props) {
        super(props);
        const {unique, t, onError, allowCreate, uri, parallelUri} = props;
        let label = t('tree.root.select.multiple');
        if(unique){
            label = t('tree.root.select.unique');
        }
        this.loader = new Loader(label, uri, allowCreate, onError, parallelUri);
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
        const tree = new TreeNode("/", this.loader, null, ()=>{
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

    componentWillUnmount(){
        this.loader.close();
    }

    nodesToGroups(items, groups, node, level = 0, startIndex = 0) {
        items.push({key:node.getPath(), name:node.getPath(), node: node});
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
        const {parallelUri} = this.props;
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
            if(parallelUri) {
                return {
                    path: k,
                    node:item.node && item.node.fromTree?item.node:null
                }
            } else {
                return k;
            }
        });
    }

    creationLabel(node){
        const {uri, parallelUri, t} = this.props;
        let type;
        if(node.fromTree === 'left'){
            type = parseUri(parallelUri, {}, true)['protocol'].replace(":", "")
        } else {
            type = parseUri(uri, {}, true)['protocol'].replace(":", "")
        }
        let tLabel = type;
        if(t('editor.picker.type.' + type)){
            tLabel = t('editor.picker.type.' + type).toLowerCase()
        }
        return t('tree.selective.will-be-created').replace('%s', tLabel);
    }

    componentDidMount(){
        const {tree} = this.state;
        const {initialSelection, onError} = this.props;
        onError(null);
        tree.load(initialSelection);
    }

    onRenderGroup(data){
        const {onToggleCollapse, onToggleSelectGroup, styles, ...all} = data;
        const {unique, onError} = this.props;
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
                return group.node.parent.createChildFolder(newName).catch((e) => {
                    onError(e);
                });
            } else {
                return Promise.reject(new Error('Please provide a name'))
            }
        };

        return <GroupHeader
            {...all}
            styles={hStyles}
            isGroupLoading={isGroupLoading}
            onToggleCollapse={toggleCollapse}
            onToggleSelectGroup={toggleSelectGroup}
            expandButtonProps={expandProps}
            onRenderTitle={({group, isSelected})=> {
                if(group.name === TreeNode.CREATE_FOLDER) {
                    return <FolderPrompt onFinish={(newName) => onNewFolder(group, newName)}/>
                }else{
                    let label = group.name;
                    if (group.node && group.node.label){
                        label = group.node.label;
                    }
                    let create;
                    if (isSelected && group.node && group.node.fromTree && group.node.fromTree !== "both") {
                        create = <span style={{opacity:.47, fontStyle:'italic'}}>{this.creationLabel(group.node)}</span>
                    }
                    return <div>{label} {create}</div>
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
        this.state = {loading: false, open: false, value: "", error: ""};
    }

    close(){
        this.setState({loading: false, open: false, value: "", error:""})
    }

    submit(){
        const {onFinish} = this.props;
        this.setState({loading: true});
        const {value} = this.state;
        onFinish(value).then(()=> {
            this.close();
        }).catch(e => {
            this.setState({error: e.message, loading: false})
        })
    }

    render(){
        const {t} = this.props;
        const {open, value, error, loading} = this.state;
        let content;
        if(open){
            content = (
                <React.Fragment>
                    <TextField
                        autoFocus={true}
                        placeholder={t('tree.create.folder.placeholder')}
                        value={value}
                        disabled={loading}
                        onChange={(e,v)=>{this.setState({value: v})}}
                    />
                    {error && <span style={{color: '#E53935',fontFamily: 'Roboto Medium', marginLeft: 5}}>{error}</span>}
                    <IconButton iconProps={{iconName:'CheckMark'}} onClick={() => this.submit()} disabled={loading || !value}/>
                    <IconButton iconProps={{iconName:'Cancel'}} onClick={() => this.close()} disabled={loading}/>
                    {loading && <Spinner size={SpinnerSize.xSmall}/>}
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
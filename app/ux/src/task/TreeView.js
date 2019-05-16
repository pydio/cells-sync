import * as React from 'react';
import { GroupedList, GroupHeader } from 'office-ui-fabric-react/lib/components/GroupedList/index';
import { FocusZone } from 'office-ui-fabric-react/lib/FocusZone';
import { Selection, SelectionMode, SelectionZone } from 'office-ui-fabric-react/lib/utilities/selection/index';
import {TreeNode, Loader} from "../models/TreeNode";

export default class TreeView extends React.Component {
    _selection;

    nodesToGroups(items, groups, node, level = -1, startIndex = 0) {
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

    filterSelection(selection){
        if(!selection || !selection.length) {
            return [];
        } else {
            return selection.map(item => {
                let k = item.key;
                if(k.length && k[0] !== '/') {
                    k = '/' + k;
                }
                return k;
            });
        }
    }

    constructor(props) {
        super(props);
        const loader = new Loader(props.uri);
        const tree = new TreeNode("/", loader, null, ()=>{
            let items = [], groups = [];
            this.nodesToGroups(items, groups, tree, 0, 0);
            this._selection.setItems(items);
            setTimeout(() => {this.forceUpdate()}, 0);
        });
        this.state = {tree, items:[], groups:[]};
        this._selection = new Selection({onSelectionChanged:()=>{
            this.props.onSelectionChanged(this.filterSelection(this._selection.getSelection()))
        }});
        this._selection.setItems([]);
    }

    componentDidMount(){
        const {tree} = this.state;
        tree.load();
    }

    onRenderGroup(data){
        const {onToggleCollapse, styles, ...all} = data;

        const toggleCollapse = (group) => {
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
            title:{marginRight: 10}
        };

        return <GroupHeader
            {...all}
            styles={hStyles}
            isGroupLoading={isGroupLoading}
            onToggleCollapse={toggleCollapse}
        />
    }

    render(){

        const {tree} = this.state;
        let items = [], groups = [];
        this.nodesToGroups(items, groups, tree, 0, 0);

        return (
            <div>
                <FocusZone>
                    <SelectionZone selection={this._selection} selectionMode={SelectionMode.single}>
                        <GroupedList
                            items={[]}
                            selection={this._selection}
                            selectionMode={SelectionMode.multiple}
                            groups={groups}
                            groupProps={{showEmptyGroups:true, onRenderHeader:this.onRenderGroup}}
                            compact={true}
                            onRenderCell={()=>{return null}}

                        />
                    </SelectionZone>
                </FocusZone>
            </div>
        );
    }

}

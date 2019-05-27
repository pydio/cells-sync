import * as React from 'react';
import { GroupedList, GroupHeader } from 'office-ui-fabric-react/lib/components/GroupedList/index';
import { FocusZone } from 'office-ui-fabric-react/lib/FocusZone';
import { Selection, SelectionMode, SelectionZone } from 'office-ui-fabric-react/lib/utilities/selection/index';
import {TreeNode, Loader} from "../models/TreeNode";

export default class TreeView extends React.Component {

    constructor(props) {
        super(props);
        const loader = new Loader(props.uri);
        const selection = new Selection({onSelectionChanged:()=>{
            this.setState({selection: selection}, () => {
                this.props.onSelectionChanged(this.filterSelection());
            });
        }});
        const tree = new TreeNode("/", loader, null, ()=>{
            let items = [], groups = [];
            this.nodesToGroups(items, groups, tree);
            this.state.selection.setItems(items);
            setTimeout(() => {this.forceUpdate()}, 0);
        });
        this.state = {
            tree,
            items:[],
            groups:[], selection};
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
            selection.toggleIndexSelected(0);
            selection.getSelectedIndices().forEach(index => {
                selection.toggleIndexSelected(index);
            });
            this.forceUpdate();
        }
        const selected = selection.getSelection() || [];
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
            title:{marginRight: 10},
        };
        if(data.group.startIndex === 0){
            //hStyles.check = {visibility:'hidden'};
        }
        return <GroupHeader
            {...all}
            styles={hStyles}
            isGroupLoading={isGroupLoading}
            onToggleCollapse={toggleCollapse}
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

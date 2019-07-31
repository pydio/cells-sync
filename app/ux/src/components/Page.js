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
import {Depths} from "@uifabric/fluent-theme";
import {CommandBar, ScrollablePane, Sticky, StickyPositionType} from "office-ui-fabric-react";

const styles={
    header:{
        zIndex: 10,
        margin: '0 10px',
        backgroundColor:'#ECEFF1',
        padding:'3px 16px',
        boxShadow:Depths.depth8,
        display:'flex',
        alignItems:'center',
        fontSize: 18,
        color: '#607D8B',
    },
    block:{
        backgroundColor:'white',
        boxShadow:Depths.depth4,
        margin: 10,
        padding: 16
    },
    cmdBarStyle:{
        root:{backgroundColor:'transparent'}
    },
    buttonStyle:{
        root:{
            backgroundColor:'transparent',
            selectors:{
                "&.is-disabled":{backgroundColor:'transparent'},
            }
        },
        rootHovered:{
            backgroundColor:'rgba(255,255,255,0.5)',
        }
    }
};

class PageBlock extends React.Component{
    render() {
        const {children, style} = this.props;
        return <div style={{...styles.block, ...style}}>{children}</div>
    }
}

class CmdBar extends React.Component {
    render() {
        let items;
        if(this.props.items){
            items = this.props.items.map(item => {
                return {...item, buttonStyles: styles.buttonStyle}
            });
        }
        return <CommandBar styles={styles.cmdBarStyle} farItems={items} items={[]}/>
    }
}

class Page extends React.Component{

    render() {

        const {children, title, flex, barItems} = this.props;

        if(flex) {
            return (
                <div style={{width:'100%', height: '100%', position:'relative'}}>
                    <div style={{...styles.header,height: 44}}>
                        <span>{title}</span>
                        {barItems && <span style={{flex:1}}><CmdBar items={barItems}/></span>}
                    </div>
                    <div style={{boxShadow:Depths.depth4, overflow: 'hidden',position: 'absolute',left: 10, right: 10, top: 60, bottom: 10}}>
                        {children}
                    </div>
                </div>

            );
        } else {

            return (
                <div style={{width:'100%', position:'relative'}}>
                    <ScrollablePane>
                        <Sticky stickyPosition={StickyPositionType.Header}>
                            <div style={styles.header}>
                                <span>{title}</span>
                                {barItems && <span style={{flex:1}}><CmdBar items={barItems}/></span>}
                            </div>
                        </Sticky>
                        <div>
                            {children}
                        </div>
                    </ScrollablePane>
                </div>

            );

        }

    }
}

export {Page, PageBlock, CmdBar, styles as PageStyles}
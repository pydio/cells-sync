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
import Colors from "./Colors";

const styles={
    header:{
        zIndex: 10,
        margin: 0,
        padding:'6px 6px 6px 20px',
        display:'flex',
        alignItems:'center',
        fontSize: 18,
        /*fontFamily:'Roboto Medium',*/
        backgroundColor:Colors.tint40,
        color: Colors.white,
    },
    block:{
        backgroundColor:Colors.white,
        boxShadow:Depths.depth4,
        margin: 16,
        padding: 16,
        borderRadius: 3
    },
    cmdBarStyle:{
        root:{backgroundColor:'transparent'}
    },
    buttonStyle:{
        root:{
            borderRadius: 3,
            color:'white',
            backgroundColor:'transparent',
            transition:'backgroundColor 0.5s ease',
            selectors:{
                "&.is-disabled":{backgroundColor:'transparent'},
            }
        },
        rootHovered:{
            color:'white',
            backgroundColor:'rgba(255,255,255,0.15)',
        },
        icon:{
            color:'white !important'
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

        const {children, title, flex, noShadow, barItems} = this.props;

        if(flex) {
            return (
                <div style={{width:'100%', height: '100%', position:'relative'}}>
                    <div style={{...styles.header,height: 44}}>
                        <span>{title}</span>
                        {barItems && <span style={{flex:1}}><CmdBar items={barItems}/></span>}
                    </div>
                    <div style={{boxShadow:(noShadow?null:Depths.depth4), overflow: 'hidden',position: 'absolute',left: 16, right: 16, top: 72, bottom: 16, borderRadius:3}}>
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
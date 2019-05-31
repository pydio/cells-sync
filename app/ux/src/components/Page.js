import React, {Fragment} from 'react'
import {Depths} from "@uifabric/fluent-theme";

export default class Page extends React.Component{
    render() {
        const {children, title, legend, flex} = this.props;
        const titleBlock = (
            <Fragment>
                <h2 style={{fontWeight: 400, fontSize:30}}>{title}</h2>
                {legend && <legend style={{color:"darkgrey", marginTop: -20, marginBottom: 20}}>{legend}</legend>}
            </Fragment>
        );
        const mainStyle = {width:'100%', margin:10, padding: 20, paddingTop: 0, boxShadow: Depths.depth4, backgroundColor:'white'};
        if (flex) {
            return (
                <div style={{...mainStyle, display:'flex', flexDirection:'column'}}>
                    {titleBlock}
                    <div style={{flex: 1, overflow:'hidden'}}>
                        {children}
                    </div>
                </div>
            );
        } else {
            return (
                <div style={mainStyle}>
                    {titleBlock}
                    {children}
                </div>
            );
        }
    }
}
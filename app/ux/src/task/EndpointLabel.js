import React from 'react'
import EndpointTypes from '../models/EndpointTypes'
import parse from 'url-parse'
import {Icon, TooltipHost, DirectionalHint} from 'office-ui-fabric-react'
import moment from 'moment'

export default function ({style, uri, info, t}) {
    const data = parse(uri);
    let eType;
    EndpointTypes.forEach(val => {
        if (val.key+':' === data.protocol){
            eType = val;
        }
    });
    if (!eType){
        return (
            <div>[unrecognized?]</div>
        );
    }
    const {Connected, LastConnection} = info;
    let styles = {
        container: {border: '1px solid #eceff1', display:'flex', alignItems:'center'},
        type: {padding: 5, backgroundColor:'#eceff1', borderRadius: 2, marginRight: 5},
        label:{flex: 1, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden'},
    };
    if (!Connected){
        styles.container.border = '1px solid #d32f2f';
        styles.container.backgroundColor = '#fde7e9';
        styles.type.backgroundColor = '#d32f2f';
    }
    return (
        <div style={{...styles.container, ...style}}>
            <span style={styles.type}><Icon iconName={eType.icon}/></span>
            <span style={styles.label}>{data.host}{data.pathname}</span>
            {!Connected &&
                <TooltipHost id={uri} content={<div style={{color:'#d32f2f'}}>{t('task.disconnected')} {moment(LastConnection).fromNow()}</div>} directionalHint={DirectionalHint.bottomCenter}>
                    <Icon aria-labelledby={uri} iconName={"Warning"} styles={{root:{color:'#d32f2f', padding: 5, cursor:'pointer'}}}/>
                </TooltipHost>
            }
        </div>
    );
}
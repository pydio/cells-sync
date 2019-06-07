import React from 'react'
import EndpointTypes from '../models/EndpointTypes'
import parse from 'url-parse'
import {Icon, TooltipHost, DirectionalHint, ProgressIndicator} from 'office-ui-fabric-react'
import moment from 'moment'

export default function ({style, uri, info, status, t}) {
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
        container: {
            border: '1px solid #eceff1',
            display:'flex',
        },
        type: {
            padding: '5px 5px 0',
            backgroundColor:'#eceff1',
            fontSize: 16
        },
        label:{
            display:'flex',
            alignItems: 'center',
            position: 'relative',
            flex: 1,
            whiteSpace:'nowrap',
            textOverflow:'ellipsis',
            overflow:'hidden',
        },
        pg: {
            position:'absolute',
            height: 10,
            bottom: 0,
            left: 0,
            right: 0
        }
    };
    if (!Connected){
        styles.container.border = '1px solid #d32f2f';
        styles.container.backgroundColor = '#fde7e9';
        styles.type.backgroundColor = '#d32f2f';
    }
    return (
        <div style={{...styles.container, ...style}}>
            <span style={styles.type}><Icon iconName={eType.icon}/></span>
            <div style={styles.label}>
                <span style={{paddingLeft: 5}}>{data.host}{data.pathname}{status.StatusString && <span style={{color:'rgba(0,0,0,.5)'}}> ({status.StatusString.toLowerCase()})</span>}</span>
                {status.Progress > 0 &&
                    <ProgressIndicator percentComplete={status.Progress} styles={{root:styles.pg, progressTrack:{backgroundColor:'transparent'}}}/>
                }
            </div>
            {!Connected &&
                <TooltipHost id={uri} content={<div style={{color:'#d32f2f'}}>{t('task.disconnected')} {moment(LastConnection).fromNow()}</div>} directionalHint={DirectionalHint.bottomCenter}>
                    <Icon aria-labelledby={uri} iconName={"Warning"} styles={{root:{color:'#d32f2f', padding: 5, cursor:'pointer'}}}/>
                </TooltipHost>
            }
        </div>
    );
}
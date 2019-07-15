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
    const {Connected, LastConnection, WatcherActive} = info;
    let styles = {
        container: {
            border: '1px solid #eceff1',
            borderLeftWidth: 0,
            borderRadius: 18,
            display:'flex',
            overflow:'hidden',
        },
        type: {
            padding: '6px 10px 0px 8px',
            backgroundColor: '#607D8B',
            color: 'white',
            fontSize: 20,
            transition: 'all 350ms cubic-bezier(0.23, 1, 0.32, 1) 0ms',
            borderRadius: '50%',
            display: 'block',
            width: 36,
            height: 36,
            boxSizing: 'border-box',
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
        labelInt: {
            paddingLeft: 10,
            fontSize: 18,
            color: '#607D8B',
        },
        pg: {
            position:'absolute',
            height: 10,
            bottom: 0,
            left: -18,
            right: 0
        }
    };
    if (!Connected){
        styles.container.border = '1px solid #d32f2f';
        styles.container.backgroundColor = '#fde7e9';
        styles.type.backgroundColor = '#d32f2f';
        styles.labelInt.color = '#d32e30';
    } else if(WatcherActive) {
        styles.type.backgroundColor = '#CFD8DC';
    }
    return (
        <div style={{...styles.container, ...style}}>
            <span style={styles.type}><Icon iconName={eType.icon}/></span>
            <div style={styles.label}>
                <span style={styles.labelInt}>{data.host}{data.pathname}{status.StatusString && <span style={{color:'rgba(0,0,0,.5)'}}> ({status.StatusString.toLowerCase()})</span>}</span>
                {status.Progress > 0 &&
                    <ProgressIndicator percentComplete={status.Progress} styles={{root:styles.pg, progressTrack:{backgroundColor:'transparent'}}}/>
                }
            </div>
            {!Connected &&
                <TooltipHost id={uri} content={<span style={{color:'#d32f2f'}}>{t('task.disconnected')} {moment(LastConnection).fromNow()}</span>} directionalHint={DirectionalHint.bottomCenter}>
                    <Icon aria-labelledby={uri} iconName={"Warning"} styles={{root:{color:'#d32f2f', padding: '11px', cursor:'pointer'}}}/>
                </TooltipHost>
            }
        </div>
    );
}
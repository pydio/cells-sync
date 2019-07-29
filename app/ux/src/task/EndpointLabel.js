import React from 'react'
import EndpointTypes from '../models/EndpointTypes'
import parse from 'url-parse'
import {Icon, TooltipHost, DirectionalHint, ProgressIndicator} from 'office-ui-fabric-react'
import moment from 'moment'
const emptyTime = "0001-01-01T00:00:00Z";

export default class EndpointLabel extends React.Component {

    constructor(props){
        super(props);
        this.state = {};
    }

    render() {

        const {style, uri, info, status, t, openRoot} = this.props;

        const data = parse(uri);
        let eType;
        EndpointTypes.forEach(val => {
            if (val.key + ':' === data.protocol) {
                eType = val;
            }
        });
        if (!eType) {
            return (
                <div>[unrecognized?]</div>
            );
        }
        const {Connected, LastConnection, WatcherActive} = info;
        const baseBg = 'rgb(243, 245, 246)';
        const activeColor = 'rgb(0, 120, 212)';
        const errorColor = '#d32f2f';

        let styles = {
            container: {
                backgroundColor: baseBg,
                /*
                border: '1px solid #eceff1',
                borderLeftWidth: 0,
                */
                borderRadius: 18,
                display: 'flex',
                overflow: 'hidden',
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
                position: 'relative'
            },
            label: {
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                flex: 1,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
            },
            labelInt: {
                paddingLeft: 10,
                fontSize: 18,
                color: '#607D8B',
            },
            pg: {
                position: 'absolute',
                height: 10,
                bottom: 0,
                left: 0,
                right: 0
            },
            statusIcon: {
                position: 'absolute',
                height: 7,
                width: 7,
                backgroundColor: '#4CAF50',
                borderRadius: '50%',
                border: '2px solid ' + baseBg,
                bottom: -1,
                right: 1,
            },
            statusString: {
                opacity: 0.7,
                fontSize: 15,
            },
            openIcon: {
                display:'none',
                color: '#60748B',
                padding: '11px',
                cursor: 'pointer'
            },
            errorIcon: {
                color: errorColor,
                padding: '11px',
                cursor: 'pointer'
            }
        };
        if (!Connected) {
            styles.statusIcon.backgroundColor = errorColor;
        } else if (WatcherActive || status.Progress > 0 || status.StatusString) {
            styles.statusIcon.backgroundColor = activeColor;
        }
        let OpenLink;
        const {showOpenLink} = this.state;
        let lStyle = {...styles.openIcon};
        if (showOpenLink){
            lStyle.display = 'block';
        }
        data.query = {};
        data.username = '';
        data.password = '';
        data.hash = '';
        if ( data.protocol === 'fs:' && window.linkOpener ){
            OpenLink = data.toString();
            OpenLink = OpenLink.replace('fs://', '');
        } else if (data.protocol.indexOf('http') === 0){
            OpenLink = data.toString();
        }
        return (
            <div
                style={{...styles.container, ...style}}
                onMouseOver={() => {this.setState({showOpenLink: true})}}
                onMouseOut={() => {this.setState({showOpenLink: false})}}
            >
                <span style={styles.type}>
                    <Icon iconName={eType.icon}/>
                    <div style={styles.statusIcon}/>
                </span>
                <div style={styles.label}>
                    <span style={styles.labelInt}>{data.host}{data.pathname}{status.StatusString &&
                    <span style={styles.statusString}> ({status.StatusString.toLowerCase()})</span>}</span>
                    {status.Progress > 0 &&
                    <ProgressIndicator percentComplete={status.Progress}
                                       styles={{root: styles.pg, progressTrack: {backgroundColor: 'transparent'}}}/>
                    }
                </div>
                {!Connected &&
                <TooltipHost id={uri} content={<span
                    style={{color: errorColor}}>{t('task.disconnected')} {LastConnection && LastConnection !== emptyTime ? t('task.disconnected.last') +  moment(LastConnection).fromNow() : ''}</span>}
                             directionalHint={DirectionalHint.bottomCenter}>
                    <Icon aria-labelledby={uri} iconName={"Warning"} styles={{root: styles.errorIcon}}/>
                </TooltipHost>
                }
                {Connected && OpenLink &&
                    <Icon iconName={"OpenInNewWindow"} styles={{root: {...lStyle, display:showOpenLink?'block':'none'}}} onClick={() => openRoot(OpenLink) }/>
                }
            </div>
        );

    }
}
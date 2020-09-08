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
import React, {Component} from 'react'
import {
    Icon,
    ScrollablePane,
    Spinner,
    SpinnerSize,
    Sticky,
    StickyPositionType
} from "office-ui-fabric-react";
import {Route} from 'react-router-dom'
import {withTranslation} from "react-i18next";
import {load} from '../models/Patch'
import {Page} from "./Page";
import PatchNode from "../task/PatchNode";
import {openPath} from "../models/Open";
import {debounce} from 'lodash'
import Colors from "./Colors";
import {makeCompound} from "./PageTasks";
import moment from "moment";
import parse from "url-parse";
import basename from "basename";

class PageActivities extends Component {

    constructor(props) {
        super(props);
        this.state = {syncTasks:{...props.syncTasks}};
        this._load = debounce(this.load.bind(this), 500);
        this.load();
    }

    componentWillReceiveProps(nextProps, nextContext) {
        this.setState({syncTasks: {...nextProps.syncTasks}}, () => {this._load()});
    }

    load(){
        const {syncTasks} = this.state;
        if(!syncTasks) {
            return
        }
        const keys = Object.keys(syncTasks);
        const proms = keys.map(uuid => {
            return load(syncTasks[uuid].Config, 0, 1);
        })
        Promise.all(proms).then((results) => {
            const data = {};
            //results.forEach((r,i) => {data[keys[i]] = r})
            const sorting = [];
            results.forEach((r,i) => {
                if(r.length && r[0].Root){
                    sorting.push({key:keys[i], patch:r[0]})
                }
            })
            console.log(sorting);
            sorting.sort((a,b)=>{
                const stampA = a.patch.Root.Stamp;
                const stampB = b.patch.Root.Stamp;
                return (stampA === stampB?0:(stampA>stampB?-1:1))
            })
            console.log(sorting);
            sorting.forEach((s) => {data[s.key] = s.patch});
            this.setState({data})
        })
    }

    syncLabel(task){
        const label = (uri) => {
            const parsed = parse(uri, {}, true);
            if(parsed.protocol.indexOf('http') === 0) {
                return parsed.host;
            } else {
                return basename(parsed.pathname);
            }
        }
        return (
            <React.Fragment>
                {label(task.Config.LeftURI)}
                <Icon
                    iconName={"Sort" + (task.Config.Direction === 'Bi' ? '' : (task.Config.Direction === 'Right' ? 'Down' : 'Up'))}
                    styles={{root:{height:15, margin:'0 5px', transform: 'rotate(-90deg)', width: 16}}}
                />
                {label(task.Config.RightURI)}
            </React.Fragment>
        );
    }

    render() {
        const {syncTasks, socket, t} = this.props;
        const {data} = this.state;
        const loading = socket.firstLoad();

        return (
            <Route render={({history}) => {
                if (loading) {
                    return (
                        <Page title={t("activities.title")} barItems={[]} flex={true} noShadow={true}>
                            <div style={{
                                height: '100%',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <div style={{
                                    height: 40, width: 40,
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}><Spinner size={SpinnerSize.large}/></div>
                            </div>
                        </Page>
                    )
                } else if(!Object.keys(syncTasks).length) {
                    return (
                        <Page title={t("activities.title")} barItems={[]} flex={true} noShadow={true}>
                            <div style={{
                                height: '100%',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>{makeCompound(t, history)}</div>
                        </Page>
                    )

                } else {
                    return (
                        <Page title={t("activities.title")} barItems={[]} flex={true}>
                            <div style={{position:'relative', height:'100%', backgroundColor:'white'}}>
                                <ScrollablePane styles={{contentContainer:{height:'100%', backgroundColor:'#fafafa'}}}>
                                    {data && Object.keys(data).map(key => {
                                        const patch = data[key];
                                        const task = syncTasks[key];
                                        return (
                                            <React.Fragment key={key}>
                                                <Sticky stickyPosition={StickyPositionType.Header} key={key + "-title"}>
                                                    <div style={{backgroundColor: Colors.tint90, color:Colors.tint30, fontFamily: 'Roboto Medium', display:'flex', alignItems:'center', padding:'12px 0'}}>
                                                        <span style={{flex: 1, paddingLeft: 8, display:'flex', alignItems:'center'}}>
                                                            <Icon iconName={"Activities"} styles={{root:{fontSize:'1.3em', height:18, marginRight: 5}}}/>
                                                            {this.syncLabel(task)}&nbsp;
                                                            <span style={{opacity:.5}}>{moment(patch.Root.Stamp).fromNow()}</span>
                                                        </span>
                                                        <span style={{width: 130, marginRight: 8, textAlign:'center'}}>{t('patch.header.operations')}</span>
                                                    </div>
                                                </Sticky>
                                                <div style={{paddingBottom: 6, paddingTop: 6}}>
                                                    {patch.Error && <div>{patch.Error}</div>}
                                                    {patch.Root.Children.map((c,i) =>
                                                        <PatchNode
                                                            key={key+ "-" + i}
                                                            patch={c}
                                                            level={0}
                                                            open={true}
                                                            flatMode={true}
                                                            openPath={(path, isURI) => {openPath(path, task, isURI)}}
                                                        />
                                                    )}
                                                </div>
                                            </React.Fragment>
                                        );
                                    })}
                                </ScrollablePane>
                            </div>
                        </Page>
                    );
                }
            }}/>
        );
    }

}

PageActivities = withTranslation()(PageActivities);

export default PageActivities
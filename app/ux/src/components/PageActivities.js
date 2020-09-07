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
    CompoundButton,
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
        console.log("LOAD?", syncTasks);
        if(!syncTasks) {
            return
        }
        const keys = Object.keys(syncTasks);
        const proms = keys.map(uuid => {
            return load(uuid, 0, 1);
        })
        Promise.all(proms).then((results) => {
            const data = {};
            results.forEach((r,i) => {data[keys[i]] = r})
            this.setState({data})
        })
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
                                        const patches = data[key];
                                        if(!patches.length){
                                            return null;
                                        }
                                        const task = syncTasks[key];
                                        patches.reverse();
                                        return (
                                            <React.Fragment key={key}>
                                                <Sticky stickyPosition={StickyPositionType.Header} key={key + "-title"}>
                                                    <div style={{backgroundColor: Colors.tint90, color:Colors.tint30, fontFamily: 'Roboto Medium', display:'flex', alignItems:'center', padding:'12px 0'}}>
                                                        <span style={{flex: 1, paddingLeft: 8}}><Icon iconName={"RecurringTask"}/> {task.Config.Label}</span>
                                                        <span style={{width: 130, marginRight: 8, textAlign:'center'}}>{t('patch.header.operations')}</span>
                                                    </div>
                                                </Sticky>
                                                {patches.map((patch, k) => {
                                                    return (
                                                        <div key={key + k} style={{paddingBottom: 2, borderTop: k > 0 ? '1px solid #e0e0e0' : null}}>
                                                            <PatchNode
                                                                patch={patch.Root}
                                                                stats={patch.Stats}
                                                                level={0}
                                                                open={true}
                                                                flatMode={true}
                                                                openPath={(path, isURI) => {openPath(path, task, isURI)}}
                                                                patchError={patch.Error}
                                                            />
                                                        </div>
                                                    );
                                                })
                                                }
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
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
import {CompoundButton, Spinner, SpinnerSize} from "office-ui-fabric-react";
import {Route} from 'react-router-dom'
import {withTranslation} from "react-i18next";
import SyncTask from "../task/SyncTask";
import {Page} from "./Page";
import Colors from "./Colors";

export function makeCompound(t, history){
    return (
        <CompoundButton
            iconProps={{iconName: 'Add'}}
            secondaryText={t('main.create.legend')}
            styles={{
                root:{backgroundColor:Colors.cellsOrange, color:Colors.white},
                rootPressed:{backgroundColor:Colors.cellsOrange, color:Colors.white},
                rootHovered:{backgroundColor:Colors.cellsOrange, color:Colors.white},
                description:{color:Colors.white},
                descriptionHovered:{color:Colors.white},
                descriptionPressed:{color:Colors.white},
            }}
            onClick={() => {
                history.push('/tasks/create')
            }}
        >{t('main.create')}</CompoundButton>
    )
}

class PageTasks extends Component {

    render() {
        const {syncTasks, socket, t} = this.props;
        let hasRunning = false, allPaused = true;
        const tasksArray = Object.keys(syncTasks).map(k => {
            const s = syncTasks[k];
            if(s.Status === 3) hasRunning = true;
            if(s.Status !== 1) allPaused = false;
            return s;
        });
        tasksArray.sort((tA, tB) => {
            const lA = tA.Config.Label.toLowerCase();
            const lB = tB.Config.Label.toLowerCase();
            return lA === lB ? 0 : (lA > lB ? 1 : -1);
        });

        let cmdBarItems = [];
        if (tasksArray.length > 1) {
            cmdBarItems.push({
                key:'resync',
                text:t('main.all.resync'),
                title:t('main.all.resync.legend'),
                disabled:hasRunning,
                iconProps:{iconName:'Sync'},
                onClick:()=>socket.sendMessage('CMD', {Cmd:'loop'})
            }, {
                key:'resume',
                text:allPaused ? t('main.all.resume') : t('main.all.pause'),
                title:allPaused ? t('main.all.resume.legend') : t('main.all.pause.legend'),
                iconProps:{iconName:(allPaused?'Play':'Pause')},
                onClick:()=>socket.sendMessage('CMD', {Cmd:allPaused ? 'resume' : 'pause'})
            })
        }

        const styles = {
            bigButtonContainer: {
                display: 'flex',
                height: '100%',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center'
            }
        };

        const loading = socket.firstLoad();

        return (
            <Route render={({history}) => {
                let content;
                let flex;
                if(loading){
                    flex = true;
                    content = (
                        <div style={styles.bigButtonContainer}>
                            <div style={{
                                height:40, width:40,
                                backgroundColor:'white',
                                borderRadius:'50%',
                                display:'flex',
                                alignItems:'center',
                                justifyContent:'center'
                            }}><Spinner size={SpinnerSize.large} /></div>
                        </div>
                    );
                } else if(tasksArray.length){
                    cmdBarItems.push({
                        key:'create',
                        text:t('main.create'),
                        title:t('main.create.legend'),
                        primary:true,
                        iconProps:{iconName:'Add'},
                        onClick:()=>history.push('/tasks/create'),
                    });
                    content = (
                        <React.Fragment>
                            {tasksArray.map(task =>
                                <SyncTask
                                    key={task.Config.Uuid}
                                    state={task}
                                    socket={socket}
                                    openEditor={() => {
                                        history.push('/tasks/edit/' + task.Config.Uuid)
                                    }}
                                />
                            )}
                        </React.Fragment>
                    );
                } else {
                    flex = true;
                    content = (
                        <div style={styles.bigButtonContainer}>{makeCompound(t, history)}</div>
                    );
                }
                return (
                    <Page flex={flex} noShadow={flex} title={t("nav.tasks")} barItems={cmdBarItems}>{content}</Page>
                );
            }}/>
        );
    }

}

PageTasks = withTranslation()(PageTasks);

export default PageTasks
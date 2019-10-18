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
import {CompoundButton} from "office-ui-fabric-react";
import {Route} from 'react-router-dom'
import {withTranslation} from "react-i18next";
import SyncTask from "../task/SyncTask";
import {Page} from "./Page";

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

        return (
            <Route render={({history}) => {
                if (tasksArray.length){
                    cmdBarItems.push({
                        key:'create',
                        text:t('main.create'),
                        title:t('main.create.legend'),
                        primary:true,
                        iconProps:{iconName:'Add'},
                        onClick:()=>history.push('create'),
                    });
                    return (
                        <Page title={t("nav.tasks")} barItems={cmdBarItems}>
                            {tasksArray.map(task =>
                                <SyncTask
                                    key={task.Config.Uuid}
                                    state={task}
                                    socket={socket}
                                    openEditor={() => {
                                        history.push('/edit/' + task.Config.Uuid)
                                    }}
                                />
                            )}
                        </Page>
                    );
                } else {
                    return (
                        <div style={styles.bigButtonContainer}>
                            <CompoundButton
                                primary={true}
                                iconProps={{iconName: 'Add'}}
                                secondaryText={t('main.create.legend')}
                                onClick={() => {
                                    history.push('/create')
                                }}
                            >{t('main.create')}</CompoundButton>
                        </div>
                    );
                }
            }}/>
        );
    }

}

PageTasks = withTranslation()(PageTasks);

export default PageTasks
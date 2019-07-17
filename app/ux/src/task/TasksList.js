import React, {Component} from 'react'
import {CompoundButton, ScrollablePane, Sticky, StickyPositionType} from "office-ui-fabric-react";
import SyncTask from "./SyncTask";
import {Route} from 'react-router-dom'
import {withTranslation} from "react-i18next";
import {CmdBar, PageStyles} from "../components/Page";

class TasksList extends Component {

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

        return (
            <div style={{width:'100%', position:'relative'}}>
                <Route render={({history}) => {
                    if (tasksArray.length){
                        cmdBarItems.push({
                            key:'create',
                            text:t('main.create'),
                            title:t('main.create.legend'),
                            primary:true,
                            iconProps:{iconName:'Add'},
                            onClick:()=>history.push('create'),
                            buttonStyles:{root:{backgroundColor:'transparent'}},
                        });
                        return (
                            <ScrollablePane>
                                <Sticky stickyPosition={StickyPositionType.Header}>
                                    <div style={{...PageStyles.header, display:'block'}}><CmdBar items={cmdBarItems}/></div>
                                </Sticky>
                                <div>
                                    {tasksArray.map(task => <SyncTask
                                        key={task.Config.Uuid}
                                        state={task}
                                        socket={socket}
                                        openEditor={() => {
                                            history.push('/edit/' + task.Config.Uuid)
                                        }}
                                    />)}
                                </div>
                            </ScrollablePane>
                        )
                    } else {
                        return (
                            <div style={{padding: 20, textAlign: 'center'}}>
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
            </div>
        );
    }

}

TasksList = withTranslation()(TasksList)

export default TasksList
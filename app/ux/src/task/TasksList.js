import React, {Component, Fragment} from 'react'
import {CompoundButton, DefaultButton, PrimaryButton, CommandBar} from "office-ui-fabric-react";
import {Depths, CommunicationColors} from '@uifabric/fluent-theme'
import SyncTask from "./SyncTask";
import {Route} from 'react-router-dom'
import {Translation, withTranslation} from "react-i18next";

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
            <div style={{width:'100%'}}>
                <Route render={({history}) => {
                    if (tasksArray.length){
                        cmdBarItems.push({
                            key:'create',
                            text:t('main.create'),
                            title:t('main.create.legend'),
                            primary:true,
                            iconProps:{iconName:'Add'},
                            onClick:()=>history.push('create'),
                            buttonStyles:{textContainer:{color:CommunicationColors.primary}},
                        });
                        return (
                            <Fragment>
                                <CommandBar items={[]} farItems={cmdBarItems} styles={{root:{margin: 0, padding:'4px 16px', boxShadow:Depths.depth8}}}/>
                                <div style={{padding: 8, display: 'none',alignItems: 'center', justifyContent: 'flex-end', backgroundColor: 'white', margin: 10, boxShadow:Depths.depth4}}>
                                    {tasksArray.length > 1 &&
                                        <Fragment>
                                            <DefaultButton
                                                text={t('main.all.resync')}
                                                title={t('main.all.resync.legend')}
                                                disabled={hasRunning}
                                                styles={{root:{marginRight: 10}}}
                                                iconProps={{iconName:'Sync'}}
                                                onClick={()=>{
                                                    socket.sendMessage('CMD', {Cmd:'loop'});
                                                }}
                                            />
                                            <DefaultButton
                                                text={allPaused ? t('main.all.resume') : t('main.all.pause')}
                                                title={allPaused ? t('main.all.resume.legend') : t('main.all.pause.legend')}
                                                styles={{root:{marginRight: 10}}}
                                                iconProps={{iconName:'Pause'}}
                                                onClick={()=>{
                                                    socket.sendMessage('CMD', {Cmd:allPaused ? 'resume' : 'pause'});
                                                }}
                                            />
                                        </Fragment>
                                    }
                                    <PrimaryButton
                                        text={t('main.create')}
                                        title={t('main.create.legend')}
                                        iconProps={{iconName:'Add'}}
                                        onClick={() => {
                                            history.push('/create')
                                        }}
                                    />
                                </div>
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
                            </Fragment>
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
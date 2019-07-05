import React, {Component, Fragment} from 'react'
import {CompoundButton} from "office-ui-fabric-react";
import SyncTask from "./SyncTask";
import {Route} from 'react-router-dom'
import {Translation} from "react-i18next";

class TasksList extends Component {

    render() {
        const {syncTasks, socket} = this.props;
        const tasksArray = Object.keys(syncTasks).map(k => syncTasks[k]);
        tasksArray.sort((tA, tB) => {
            const lA = tA.Config.Label.toLowerCase();
            const lB = tB.Config.Label.toLowerCase();
            return lA === lB ? 0 : (lA > lB ? 1 : -1);
        });
        return (
            <div style={{width:'100%'}}>
                <Translation>{(t) =>
                    <Route render={({history}) =>
                        <Fragment>
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
                        </Fragment>
                    }/>
                }</Translation>
            </div>
        );
    }

}

export default TasksList
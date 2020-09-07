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
import React from 'react'
import {Translation} from 'react-i18next'
import {Panel, PanelType} from "office-ui-fabric-react";
import {Route, Redirect} from 'react-router-dom'
import Editor from "../task/Editor";
import Debugger from "./Debugger";


class EditorPanel extends React.Component {

    render() {

        const {socket, syncTasks} = this.props;

        return (
            <Route render={({history, location}) =>
                <Translation>{(t) => {
                    const isOpen = location.pathname.indexOf('/tasks/create') === 0 || location.pathname.indexOf('/tasks/edit') === 0 || location.pathname === '/debugger';
                    let title;
                    if(location.pathname !== '/debugger'){
                        title = location.pathname.indexOf('/tasks/create') === 0 ? t('editor.title.new') : t('editor.title.update')
                    }
                    return(
                        <Panel
                            isOpen={isOpen}
                            type={PanelType.smallFluid}
                            onDismiss={() => {
                                history.push('/tasks')
                            }}
                            headerText={title}
                        >
                            <Route path={"/tasks/create"} render={({history}) =>
                                <Editor
                                    task={true}
                                    onDismiss={() => {
                                        history.push('/')
                                    }}
                                    socket={socket}
                                />
                            }/>
                            <Route path={"/tasks/edit/:uuid"} render={({match, history}) =>
                                syncTasks[match.params['uuid']] ?
                                    <Editor
                                        task={syncTasks[match.params['uuid']]}
                                        onDismiss={() => {
                                            history.push('/')
                                        }}
                                        socket={socket}
                                    /> :
                                    <Redirect to={"/"}/>
                            }/>
                            <Route path={"/debugger"} render={() => <Debugger/> } />
                        </Panel>
                    );
                }}</Translation>
            }/>
        )
    }

}

export default EditorPanel
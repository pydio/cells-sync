import React, {Fragment} from 'react'
import {Translation} from 'react-i18next'
import {Panel, PanelType} from "office-ui-fabric-react";
import {Route, Redirect} from 'react-router-dom'
import Editor from "../task/Editor";


class EditorPanel extends React.Component {

    render() {

        const {socket, syncTasks} = this.props;

        return (
            <Route render={({history, location}) =>
                <Translation>{(t) =>
                    <Panel
                        isOpen={location.pathname.indexOf('/create') === 0 || location.pathname.indexOf('/edit') === 0}
                        type={PanelType.smallFluid}
                        onDismiss={() => {
                            history.push('/')
                        }}
                        headerText={location.pathname.indexOf('/create') === 0 ? t('editor.title.new') : t('editor.title.update')}
                    >
                        <Route path={"/create"} render={({history}) =>
                            <Editor
                                task={true}
                                onDismiss={() => {
                                    history.push('/')
                                }}
                                socket={socket}
                            />
                        }/>
                        <Route path={"/edit/:uuid"} render={({match, history}) =>
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
                    </Panel>
                }</Translation>
            }/>
        )
    }

}

export default EditorPanel
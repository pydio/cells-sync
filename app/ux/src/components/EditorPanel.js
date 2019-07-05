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
                    const isOpen = location.pathname.indexOf('/create') === 0 || location.pathname.indexOf('/edit') === 0 || location.pathname === '/debugger';
                    let title;
                    if(location.pathname !== '/debugger'){
                        title = location.pathname.indexOf('/create') === 0 ? t('editor.title.new') : t('editor.title.update')
                    }
                    return(
                        <Panel
                            isOpen={isOpen}
                            type={PanelType.smallFluid}
                            onDismiss={() => {
                                history.push('/')
                            }}
                            headerText={title}
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
                            <Route path={"/debugger"} render={() => <Debugger/> } />
                        </Panel>
                    );
                }}</Translation>
            }/>
        )
    }

}

export default EditorPanel
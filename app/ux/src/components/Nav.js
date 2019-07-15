import React from 'react'
import {Route, Switch} from 'react-router-dom'
import {FontSizes} from "@uifabric/fluent-theme";
import {Nav as OfficeNav} from 'office-ui-fabric-react'
import {Translation} from "react-i18next";
import TasksList from "../task/TasksList";
import PageSettings from "./PageSettings";
import PageServers from "./PageServers";
import PageLogs from "./PageLogs";
import PageAbout from "./PageAbout";

class NavMenu extends React.Component {

    render() {

        const links = {
            '/': {label:'tasks', icon:'SyncToPC'},
//            '/servers': {label:'servers', icon:'Server'},
            '/settings': {label:'settings', icon:'Settings'},
            '/debugger': {label:'debugger', icon:'Code'},
            '/logs': {label:'logs', icon:'CustomList'},
            '/about': {label:'about', icon:'Help'}
        };

        const tStyles = {
            root: {
                width: 200,
                height: '100%',
                boxSizing: 'border-box',
                overflowY: 'auto',
            },
            compositeLink:{
                backgroundColor:'transparent',
                selectors:{
                    "&.is-selected .ms-Button":{backgroundColor:'white'},
                }
            },
            link:{
                backgroundColor:'transparent',
            }
        };

        return (
            <Translation>{(t) =>
                <Route render={({history, location}) =>
                    <React.Fragment>
                        <div style={{fontSize: FontSizes.size24, fontWeight: 300, padding: 8}}>{t('application.title')}</div>
                        <OfficeNav
                            onLinkClick={(e, item)=>{history.push(item.key)}}
                            selectedKey={location.pathname}
                            styles={tStyles}
                            groups={[
                                {
                                    links: Object.keys(links).map((k) => {
                                        return {name:t('nav.' + links[k].label), key:k, icon: links[k].icon}
                                    })
                                }
                            ]}
                        />
                    </React.Fragment>
                }/>
            }</Translation>
        );

    }

}

class NavRoutes extends React.Component {

    render() {

        const {syncTasks, socket} = this.props;

        return (
            <Route render={({history, location}) =>
                <Switch>
                    <Route exact path={["/", "/create", "/edit/uuid:"]} render={() => <TasksList syncTasks={syncTasks} socket={socket}/>}/>
                    <Route path={"/settings"} component={PageSettings}/>
                    <Route path={"/servers"} component={PageServers}/>
                    <Route path={"/logs"} component={PageLogs}/>
                    <Route path={"/about"} component={PageAbout}/>
                </Switch>
            }/>
        )
    }

}

export {NavMenu, NavRoutes}
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
import {Route, Switch} from 'react-router-dom'
import {FontSizes} from "@uifabric/fluent-theme";
import {Nav as OfficeNav, IconButton, TooltipHost, TooltipDelay, ContextualMenu, DirectionalHint} from 'office-ui-fabric-react'
import {Translation} from "react-i18next";
import PageTasks from "./PageTasks";
import PageSettings from "./PageSettings";
import PageAccounts from "./PageAccounts";
import PageLogs from "./PageLogs";
import PageAbout from "./PageAbout";
import Settings from '../models/Settings'
import moment from 'moment';
import PageActivities from "./PageActivities";

class NavMenu extends React.Component {

    static menuAs(menuProps){
        // Customize contextual menu with menuAs
        return <ContextualMenu {...menuProps} />;
    };

    constructor(props) {
        super(props);
        this.state = {};
    }


    componentDidMount(){
        (new Settings()).load().then((s) => {
            this.setState({showDebug: s.Debugging.ShowPanels})
            this._listener = (s) => {
                this.setState({showDebug: s.Debugging.ShowPanels})
            };
            this._listener(s);
            Settings.observe(this._listener)
        });
    }

    componentWillUnmount(){
        if(this._listener){
            Settings.stopObserving(this._listener);
        }
    }

    render() {
        const {showDebug} = this.state;

        const links = {
            '/': {label:'activities', icon:'Sort'},
            '/tasks': {label:'tasks', icon:'RecurringTask'},
            '/servers': {label:'servers', icon:'AccountBox'},
            /*'/settings': {label:'settings', icon:'Settings'},*/
        };
        if(showDebug){
            links['/logs'] = {label:'logs', icon:'CustomList'};
            links['/debugger'] = {label:'debugger', icon:'Code'};
        }
        links['/about'] = {label:'about', icon:'Info'};

        const bottomLinks = {
            '/settings': {label:'settings', icon:'Settings'}
        };

        const colors = {
            title: '#61869e',
            icon: 'rgb(238, 121, 110)'
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
                    "& .ms-Button":{height: 40},
                    "&.is-selected .ms-Button":{backgroundColor:'white', fontFamily:'Roboto Medium'},
                    "& .ms-Button-icon":{color: colors.icon},
                }
            },
            link:{
                backgroundColor:'transparent',
                color: colors.title,
                fontFamily: 'Roboto Medium',
            }
        };

        const languages = {'en':'English','fr':'Français', 'de':'Deutsch', 'it':'Italiano', 'es-es':'Español'};
        const menuItems = (i18n) => {
            return Object.keys(languages).map(key => {
                return {key, text:languages[key], iconProps:{iconName:i18n.language === key ?'CheckboxComposite':'Checkbox'}, onClick:()=>{
                    moment.locale(key);
                    i18n.changeLanguage(key).then(()=>{
                        localStorage.setItem('language', key);
                    })
                }};
            })
        };

        return (
            <Translation>{(t, {i18n}) =>
                <Route render={({history, location}) =>
                    <React.Fragment>
                        <div style={{display:'flex', alignItems:'center'}}>
                            <span className={"cells-logo"} style={{width: 24, height: 24, marginLeft: 6, display:'block'}}/>
                            <span style={{flex: 1, fontSize: FontSizes.size20, fontFamily: 'Roboto Medium', padding: 8, paddingLeft: 4, color:colors.title}}>{t('application.title')}</span>
                            <TooltipHost content={t("language.switch")} delay={TooltipDelay.zero} directionalHint={DirectionalHint.rightCenter}>
                                <IconButton
                                    iconProps={{iconName:'Flag'}}
                                    styles={{
                                        root:{marginRight: 4},
                                        menuIcon:{display:'none'},
                                        icon:{opacity:0.4, transition:'opacity 200ms'},
                                        iconHovered:{opacity:1},
                                        iconExpanded:{opacity: 1}
                                    }}
                                    menuAs={NavMenu.menuAs}
                                    menuProps={{items:menuItems(i18n)}}
                                />
                            </TooltipHost>
                        </div>
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
                        <div style={{flex: 1}}></div>
                        <OfficeNav
                            onLinkClick={(e, item)=>{history.push(item.key)}}
                            selectedKey={location.pathname}
                            styles={{...tStyles, groupContent:{marginBottom: 0}, navItems:{marginBottom: 0}}}
                            groups={[
                                {
                                    links: Object.keys(bottomLinks).map((k) => {
                                        return {name:t('nav.' + bottomLinks[k].label), key:k, icon: bottomLinks[k].icon}
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
                    <Route exact path={"/"} render={(p) => <PageActivities syncTasks={syncTasks} socket={socket}/>}/>
                    <Route path={["/tasks", "/tasks/create", "/tasks/edit/uuid:"]} render={() => <PageTasks syncTasks={syncTasks} socket={socket}/>}/>
                    <Route path={"/settings"} component={PageSettings}/>
                    <Route path={"/servers"} render={(p) => <PageAccounts {...p} socket={socket}/>}/>
                    <Route path={"/about"} render={() => <PageAbout socket={socket}/>}/>
                    <Route path={"/logs"} component={PageLogs}/>
                </Switch>
            }/>
        )
    }

}

export {NavMenu, NavRoutes}
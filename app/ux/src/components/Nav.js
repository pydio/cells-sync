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
import PageServers from "./PageServers";
import PageLogs from "./PageLogs";
import PageAbout from "./PageAbout";
import moment from 'moment';

class NavMenu extends React.Component {

    static menuAs(menuProps){
        // Customize contextual menu with menuAs
        return <ContextualMenu {...menuProps} />;
    };

    render() {

        const links = {
            '/': {label:'tasks', icon:'SyncToPC'},
            '/servers': {label:'servers', icon:'Server'},
            '/settings': {label:'settings', icon:'Settings'},
            '/logs': {label:'logs', icon:'CustomList'},
            '/about': {label:'about', icon:'Help'},
            '/debugger': {label:'debugger', icon:'Code'}
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

        const languages = {'en':'English','fr':'Français', 'de':'Deutsch'};
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
                            <span style={{flex: 1, fontSize: FontSizes.size24, fontWeight: 300, padding: 8}}>{t('application.title')}</span>
                            <TooltipHost content={t("language.switch")} delay={TooltipDelay.zero} directionalHint={DirectionalHint.rightCenter}>
                                <IconButton
                                    iconProps={{iconName:'Flag'}}
                                    styles={{root:{marginRight: 4},menuIcon:{display:'none'}}}
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
                    <Route exact path={["/", "/create", "/edit/uuid:"]} render={() => <PageTasks syncTasks={syncTasks} socket={socket}/>}/>
                    <Route path={"/settings"} component={PageSettings}/>
                    <Route path={"/servers"} render={(p) => <PageServers {...p} socket={socket}/>}/>
                    <Route path={"/logs"} component={PageLogs}/>
                    <Route path={"/about"} render={() => <PageAbout socket={socket}/>}/>
                </Switch>
            }/>
        )
    }

}

export {NavMenu, NavRoutes}
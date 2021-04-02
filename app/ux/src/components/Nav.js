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
import {
    IconButton,
    TooltipHost,
    TooltipDelay,
    ContextualMenu,
    DirectionalHint,
    Icon
} from 'office-ui-fabric-react'
import {Translation} from "react-i18next";
import PageTasks from "./PageTasks";
import PageSettings from "./PageSettings";
import PageAccounts from "./PageAccounts";
import PageLogs from "./PageLogs";
import PageAbout from "./PageAbout";
import Settings from '../models/Settings'
import moment from 'moment';
import PageActivities from "./PageActivities";
import Colors from "./Colors";

const IconStyle = {
    cursor:'pointer',
    display:'flex',
    alignItems:'center',
    height: 40,
    fontSize:'1.6em',
    padding:'0 9px 0 11px',
    color:Colors.cellsOrange,
}

class NavIcon extends React.Component {
    constructor(props) {
        super(props);
        this.state = {hover: false}
    }
    render() {
        const {icon, label, selected, onClick} = this.props;
        const {hover} = this.state;
        let style = {
            ...IconStyle,
            backgroundColor:selected?'rgba(255,255,255,.1)':'transparent',
            borderLeft:selected?'2px solid ' + Colors.active:'2px solid transparent'
        };
        if(hover){
            style = {...style, backgroundColor:'rgba(255,255,255,.15)'}
        }
        return (
            <TooltipHost
                content={<span style={{display:'block',backgroundColor:Colors.tint30, color:Colors.cellsOrange, padding:'0 6px', fontSize:15, fontFamily:'Roboto Medium'}}>{label}</span>}
                delay={TooltipDelay.zero}
                directionalHint={DirectionalHint.rightCenter}
                calloutProps={{styles:{
                    beakCurtain:{backgroundColor:Colors.tint30},beak:{backgroundColor:Colors.tint30}
                }}}
            >
                <Icon onClick={onClick} styles={{root: style}} iconName={icon} onMouseOver={()=>{this.setState({hover:true})}} onMouseOut={()=>{this.setState({hover:false})}}/>
            </TooltipHost>
        )
    }
}

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
            '/': {label:'activities', icon:'Activities'},
            '/tasks': {label:'tasks', icon:'CloudCircle'},
            '/servers': {label:'servers', icon:'AccountBox'},
            '/settings': {label:'settings', icon:'TuneRounded'},
        };
        if(showDebug){
            links['/logs'] = {label:'logs', icon:'CustomList'};
            links['/debugger'] = {label:'debugger', icon:'Code'};
        }
        links['/about'] = {label:'about', icon:'Info'};

        const languages = {'de':'Deutsch', 'en':'English', 'es-es':'Español', 'fr':'Français', 'it':'Italiano', 'lv':'Latv', 'pt-br':'Português'};
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
                        <div style={{height:56}}>
                            <span title={t('application.title')} className={"cells-logo"} style={{width: 26, height: 26, marginTop: 14, display: 'block', marginLeft: 12}}/>
                        </div>
                        {Object.keys(links).map(k => {
                            const l = links[k];
                            return (
                                <NavIcon
                                    key={k}
                                    icon={l.icon}
                                    label={t('nav.' + l.label)}
                                    selected={k === location.pathname}
                                    onClick={()=>{history.push(k)}}
                                />
                            );
                        })}
                        <div style={{flex: 1}}></div>
                        <TooltipHost content={t("language.switch")} delay={TooltipDelay.zero} directionalHint={DirectionalHint.rightCenter}>
                            <IconButton
                                iconProps={{iconName:'Flag'}}
                                styles={{
                                    root:{margin: 0, padding:'6px 5px 6px 7px', height:40, width: 'auto', backgroundColor: 'transparent'},
                                    rootHovered:{backgroundColor: 'rgba(255,255,255,.15)'},
                                    menuIcon:{display:'none'},
                                    icon:{...IconStyle, padding:4, color:'rgba(255,255,255,.73)'},
                                }}
                                menuAs={NavMenu.menuAs}
                                menuProps={{items:menuItems(i18n)}}
                            />
                        </TooltipHost>
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
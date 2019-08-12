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
import {Depths, FontSizes} from "@uifabric/fluent-theme";
import {Link} from "office-ui-fabric-react";
import {Translation} from 'react-i18next'

class Header extends React.Component {
    render() {
        return (
            <Translation>{(t, {i18n, lng}) =>
                <div style={{
                    backgroundColor: "#546e7a",
                    boxShadow: Depths.depth8,
                    color: 'white',
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    maxHeight: 50,
                    zIndex: 10
                }}>
                    <div style={{
                        flex: 1,
                        fontSize: FontSizes.size20,
                        fontWeight: 400
                    }}>{t('application.title')}</div>
                    <div style={{color: 'white', fontSize:FontSizes.size14}}>
                        <Link styles={{root: {color: 'white'}}} href={"http://localhost:6060/debug/pprof"} target={"_blank"}>Debugger</Link>
                        &nbsp;|&nbsp;<Link styles={{root: {color: 'white', textDecoration:lng==='en'?'underline':'none'}}} onClick={()=>{i18n.changeLanguage('en')}}>EN</Link>
                        &nbsp;|&nbsp;<Link styles={{root: {color: 'white', textDecoration:lng==='fr'?'underline':'none'}}} onClick={()=>{i18n.changeLanguage('fr')}}>FR</Link>
                        &nbsp;|&nbsp;<Link styles={{root: {color: 'white', textDecoration:lng==='de'?'underline':'none'}}} onClick={()=>{i18n.changeLanguage('de')}}>DE</Link>
                    </div>
                </div>
            }</Translation>
        );
    }
}

export default Header
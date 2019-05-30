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
                    </div>
                </div>
            }</Translation>
        );
    }
}

export default Header
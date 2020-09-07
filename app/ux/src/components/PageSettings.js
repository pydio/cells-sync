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
import {Page, PageBlock} from "./Page";
import Settings from '../models/Settings'
import 'observable-slim/proxy'
import ObservableSlim from 'observable-slim'
import {
    TextField,
    Toggle,
    Dropdown
} from "office-ui-fabric-react";
import {withTranslation} from "react-i18next";
import Colors from "./Colors";

class PageSettings extends React.Component {

    constructor(props){
        super(props);
        const setting = new Settings();
        this.state = {
            settings: setting,
            dirty: false,
        };
    }

    componentDidMount() {
        const {settings} = this.state;
        this.setState({loading: true});
        settings.load().then((s) => {
            const copy = new Settings(JSON.parse(JSON.stringify(s)));
            const proxy = ObservableSlim.create(s, true, ()=>{
                this.setState({settings: proxy, dirty: true});
            });
            this.setState({settings: proxy, loading: false, revert: copy, dirty: false});
        }).catch(reason => {
            this.setState({error: reason.message, loading: false});
        })
    }

    revert() {
        const {revert} = this.state;
        if(revert){
            const copy = new Settings(JSON.parse(JSON.stringify(revert)));
            const proxy = ObservableSlim.create(revert, true, ()=>{
                this.setState({settings: proxy, dirty: true});
            });
            this.setState({settings: proxy, revert: copy, dirty: false});
        }
    }

    save() {
        const {settings} = this.state;
        this.setState({loading: true});
        settings.__getTarget.save().then(newSettings => {
            const copy = new Settings(JSON.parse(JSON.stringify(newSettings)));
            const proxy = ObservableSlim.create(newSettings, true, ()=>{
                this.setState({settings: proxy, dirty: true});
            });
            this.setState({settings: proxy, loading: false, revert: copy, dirty: false});
        }).catch(error => {
            this.setState({error: error.message, loading: false});
        })
    }


    render() {
        const {t} = this.props;
        const {settings, loading, dirty} = this.state;
        let cmdBarItems = [
            {
                key:'cancel',
                text:t('button.cancel'),
                disabled:loading || !dirty,
                iconProps:{iconName:'Cancel'},
                onClick:()=> this.revert()
            },{
                key:'ok',
                text:t('button.save'),
                disabled:loading || !dirty,
                iconProps:{iconName:'Save'},
                onClick:()=> this.save()
            }
        ];

        const styles = {
            block:{
                padding:0,
                paddingBottom: 10,
                overflow:'hidden'
            },
            h3:{
                color:Colors.tint40,
                backgroundColor:Colors.tint90,
                margin:0,
                fontSize:15,
                padding: 10
            },
            content:{
                padding: 16
            }
        }

        return (
            <Page title={t('settings.title')} legend={t('settings.legend')} barItems={cmdBarItems}>
                <PageBlock style={styles.block}>
                    <h3 style={styles.h3}>{t('settings.section.update')}</h3>
                    <div style={styles.content}>
                        <Dropdown
                            label={t('settings.updates.frequency')}
                            selectedKey={settings.Updates.Frequency}
                            onChange={(e, item)=>{settings.Updates.Frequency = item.key}}
                            options={[
                                { key: 'manual', text: t('settings.updates.frequency.manual') },
                                { key: 'restart', text: t('settings.updates.frequency.restart') },
                                { key: 'daily', text: t('settings.updates.frequency.daily') },
                                { key: 'monthly', text: t('settings.updates.frequency.monthly') },
                            ]}
                        />
                        {false &&
                        <Toggle
                            label={t('settings.updates.download')}
                            checked={settings.Updates.DownloadAuto}
                            onText={t('settings.updates.download.auto')}
                            offText={t('settings.updates.download.alert')}
                            onChange={(e, v) => {
                                settings.Updates.DownloadAuto = !settings.Updates.DownloadAuto;
                            }}
                        />
                        }
                        <TextField
                            label={t('settings.updates.server')}
                            placeholder={t('settings.updates.server.placeholder')}
                            value={settings.Updates.UpdateUrl}
                            onChange={(e,v)=>{settings.Updates.UpdateUrl = v}}
                        />
                        <Dropdown
                            label={t('settings.updates.channel')}
                            selectedKey={settings.Updates.UpdateChannel}
                            onChange={(e, item)=>{settings.Updates.UpdateChannel = item.key}}
                            options={[
                                { key: 'stable', text: t('settings.updates.channel.stable')},
                                { key: 'dev', text: t('settings.updates.channel.dev')},
                            ]}
                        />
                        <TextField
                            label={t('settings.updates.publickey')}
                            placeholder={t('settings.updates.publickey.placeholder')}
                            multiline
                            autoAdjustHeight
                            styles={{field:{whiteSpace:'pre-wrap'}}}
                            value={settings.Updates.UpdatePublicKey}
                            onChange={(e,v)=>{settings.Updates.UpdatePublicKey = v}}
                        />
                    </div>
                </PageBlock>
                <PageBlock style={styles.block}>
                    <h3 style={styles.h3}>{t('settings.section.autostart')}</h3>
                    <div style={styles.content}>
                        <Toggle
                            label={t('settings.autostart.toggle')}
                            checked={settings.Service.AutoStart}
                            onText={t('settings.autostart.on')}
                            offText={t('settings.autostart.off')}
                            onChange={(e, v) => {
                                settings.Service.AutoStart = !settings.Service.AutoStart;
                            }}
                        />
                    </div>
                </PageBlock>
                <PageBlock style={styles.block}>
                    <h3 style={styles.h3}>{t('settings.section.logs')}</h3>
                    <div style={styles.content}>
                        <TextField
                            label={t('settings.logs.folder')}
                            placeholder={t('settings.logs.folder.placeholder')}
                            value={settings.Logs.Folder}
                            onChange={(e,v)=>{settings.Logs.Folder = v}}
                        />
                        <TextField
                            label={t('settings.logs.maxfiles')}
                            placeholder={t('settings.logs.maxfiles.placeholder')}
                            type={"number"}
                            value={settings.Logs.MaxFilesNumber}
                            onChange={(e, v) => { settings.Logs.MaxFilesNumber = parseInt(v); }}
                        />
                        <TextField
                            label={t('settings.logs.maxsize')}
                            placeholder={t('settings.logs.maxsize.placeholder')}
                            type={"number"}
                            value={settings.Logs.MaxFilesSize}
                            onChange={(e, v) => {settings.Logs.MaxFilesSize = parseInt(v)}}
                        />
                        <TextField
                            label={t('settings.logs.maxage')}
                            placeholder={t('settings.logs.maxage.placeholder')}
                            value={settings.Logs.MaxAgeDays}
                            onChange={(e, v) => {settings.Logs.MaxAgeDays = parseInt(v)}}
                        />
                        <Toggle
                            label={t('settings.show.debug')}
                            checked={settings.Debugging.ShowPanels}
                            onText={t('settings.show.debug.on')}
                            offText={t('settings.show.debug.off')}
                            onChange={(e, v) => {
                                settings.Debugging.ShowPanels= !settings.Debugging.ShowPanels;
                            }}
                        />
                        {settings.Debugging.ShowPanels && <div>JS LinkOpener bound : {window.linkOpener? "Yes" : "No"}</div>}
                    </div>
                </PageBlock>
            </Page>
        );
    }
}

PageSettings = withTranslation()(PageSettings);
export default PageSettings
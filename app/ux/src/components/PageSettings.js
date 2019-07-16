import React from 'react'
import Page from "./Page";
import Settings from '../models/Settings'
import 'observable-slim/proxy'
import ObservableSlim from 'observable-slim'
import {
    Stack,
    TextField,
    Toggle,
    DefaultButton,
    PrimaryButton, Dropdown
} from "office-ui-fabric-react";
import {withTranslation} from "react-i18next";

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

        const titleBlock = (
            <Stack horizontal tokens={{childrenGap: 8}} horizontalAlign="center" styles={{root:{marginTop: 30}}}>
                <div style={{flex: 1}}>{t('settings.title')}</div>
                <DefaultButton disabled={loading || !dirty} text={t('button.cancel')} onClick={()=>{this.revert()}}/>
                <PrimaryButton disabled={loading || !dirty} text={t('button.save')} onClick={() => {this.save()}}/>
            </Stack>
        );

        return (
            <Page title={titleBlock} legend={t('settings.legend')}>

                <h3>{t('settings.section.update')}</h3>
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
                <Toggle
                    label={t('settings.updates.download')}
                    checked={settings.Updates.DownloadAuto}
                    onText={t('settings.updates.download.auto')}
                    offText={t('settings.updates.download.alert')}
                    onChange={(e, v) => {
                        settings.Updates.DownloadAuto = !settings.Updates.DownloadAuto;
                    }}
                />
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
                    value={settings.Updates.UpdatePublicKey}
                    onChange={(e,v)=>{settings.Updates.UpdatePublicKey = v}}
                />

                <h3>{t('settings.section.logs')}</h3>
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

            </Page>
        );
    }
}

PageSettings = withTranslation()(PageSettings);
export default PageSettings
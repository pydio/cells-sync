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
import React, {Fragment} from 'react'
import {Page, PageBlock} from "./Page";
import Link from "./Link"
import {Link as FabricLink, ProgressIndicator} from 'office-ui-fabric-react'
import {withTranslation} from "react-i18next";
import Colors from "./Colors";

class PageAbout extends React.Component {

    constructor(props){
        super(props);
        this.state = {currentVersion:{}};
        this.updateListener = (data) => {
            if (data.CheckStatus){
                this.setState({checkStatus: data})
            } else if (data.ApplyStatus){
                this.setState({applyStatus: data})
            } else if(data.Version) {
                this.setState({currentVersion: data});
            }
        }
    }

    componentDidMount(){
        const {socket} = this.props;
        socket.listenUpdates(this.updateListener);
        socket.sendMessage('UPDATE', {Version:true});
    }

    componentWillUnmount(){
        const {socket} = this.props;
        socket.stopListeningUpdates(this.updateListener)
    }

    checkUpdates() {
        const {socket} = this.props;
        this.setState({applyStatus: null, checkStatus: null})
        socket.sendMessage('UPDATE', {Check: true})
    }

    applyUpdate(binary){
        const {socket} = this.props;
        socket.sendMessage('UPDATE', {Package:binary, DryRun:false})
    }

    render() {
        const {checkStatus, applyStatus, currentVersion} = this.state;
        const {t} = this.props;
        let updateStatus, updateProgress;
        let checkDisabled = false;
        let availableBinaries;
        if(checkStatus){
            const {CheckStatus, Binaries, Error} = checkStatus;
            switch (CheckStatus) {
                case "up-to-date":
                    updateStatus = t("about.upgrade.status.up-to-date");
                    break;
                case "checking":
                    updateStatus = t("about.upgrade.status.checking");
                    checkDisabled = true;
                    break;
                case "available":
                    updateStatus = t("about.upgrade.status.available");
                    availableBinaries = Binaries;
                    break;
                case "error":
                    updateStatus = t("about.upgrade.status.error") + Error;
                    break;
                default:
                    break;
            }
        }
        if(applyStatus){
            const {ApplyStatus, Package, Progress, Error} = applyStatus;
            switch (ApplyStatus) {
                case "error":
                    updateStatus = t('about.upgrade.apply.error') + Error;
                    break;
                case "downloading":
                    updateStatus = t('about.upgrade.apply.downloading').replace("%s", Package.PackageName + " " + Package.Version);
                    updateProgress = <ProgressIndicator percentComplete={Progress} description={t('about.upgrade.apply.transferring').replace("%s", Package.BinaryURL).replace("%d", Math.round(Progress * 100))}/>;
                    availableBinaries = null;
                    checkDisabled = true;
                    break;
                case "done":
                    updateStatus = t('about.upgrade.apply.done').replace("%s", Package.PackageName + " " + Package.Version);
                    availableBinaries = null;
                    break;
                default:
                    break;
            }
        }

        const cmdBarItems = [
            {
                key:'update',
                text:t('about.current.check'),
                disabled:checkDisabled,
                iconProps:{iconName:'CloudDownload'},
                onClick:()=> this.checkUpdates()
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
                padding: '0 16px'
            }
        }

        return (
            <Page title={t('nav.about')} barItems={cmdBarItems}>
                {updateStatus &&
                    <PageBlock>
                        <p>{updateStatus}</p>
                        {updateProgress}
                        {availableBinaries &&
                        <ul>{availableBinaries.map(b =>
                            <li key={b.Version}>{b.PackageName} {b.Version} <FabricLink onClick={() =>{this.applyUpdate(b)}}>{t('about.upgrade.install')}</FabricLink></li>
                        )}</ul>
                        }
                    </PageBlock>
                }
                <PageBlock style={styles.block}>
                    <h3 style={styles.h3}>{t('about.current.version')}</h3>
                    <div style={styles.content}>
                        <p style={{lineHeight:'1.7em'}}>
                            <span>
                                {currentVersion.PackageName} - {currentVersion.Version} {(!updateStatus && currentVersion.Version) && <FabricLink onClick={() => {this.checkUpdates()}}>{t('about.current.check')}</FabricLink> }
                            </span>
                            {currentVersion.Revision &&
                                <Fragment>
                                    <br/><span>{t('about.current.revision')} {currentVersion.Revision} ({currentVersion.BuildStamp})</span>
                                </Fragment>
                            }
                        </p>
                    </div>
                </PageBlock>
                <PageBlock style={styles.block}>
                    <h3 style={styles.h3}>{t('about.troubleshoot')}</h3>
                    <div style={styles.content}>
                        <p  style={{lineHeight:'1.7em'}}>
                            {t('about.troubleshoot.cells')}
                        </p>
                        <ul  style={{lineHeight:'1.7em'}}>
                            <li>{t('about.troubleshoot.cells1')}</li>
                            <li>{t('about.troubleshoot.pydio8')}</li>
                        </ul>
                        <p  style={{lineHeight:'1.7em'}}>
                            {t('about.troubleshoot.forum')} : <Link href={"https://forum.pydio.com"}/>. {t('about.troubleshoot.logs')}
                        </p>

                        <h3>{t('about.troubleshoot.enterprise')}</h3>

                        <p style={{lineHeight:'1.7em'}}>{t('about.troubleshoot.website')}: <Link href={"https://pydio.com"}/>.</p>

                        <h3>Licensing</h3>
                        <p style={{lineHeight:'1.7em'}}>
                            Copyright © 2019-2021 Abstrium SAS - Pydio is a trademark of Abstrium SAS <br/>
                            CellsSync code is licensed under GPL v3. You can find the source code <Link href={"https://github.com/pydio/cells-sync"}/>.
                        </p>
                    </div>
                </PageBlock>
            </Page>
        );
    }
}

export default withTranslation()(PageAbout)
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
        let updateStatus, updateProgress;
        let checkDisabled = false;
        let availableBinaries;
        if(checkStatus){
            const {CheckStatus, Binaries, Error} = checkStatus;
            switch (CheckStatus) {
                case "up-to-date":
                    updateStatus = "Package is up-to-date.";
                    break;
                case "checking":
                    updateStatus = "Checking for available updates.";
                    checkDisabled = true;
                    break;
                case "available":
                    updateStatus = "Some packages are available for update:";
                    availableBinaries = Binaries;
                    break;
                case "error":
                    updateStatus = "Something went wrong during update checks: " + Error;
                    break;
                default:
                    break;
            }
        }
        if(applyStatus){
            const {ApplyStatus, Package, Progress, Error} = applyStatus;
            switch (ApplyStatus) {
                case "error":
                    updateStatus = "Cannot apply update : " + Error;
                    break;
                case "downloading":
                    updateStatus = "Downloading " + Package.PackageName + " " + Package.Version + "...";
                    updateProgress = <ProgressIndicator percentComplete={Progress} description={"Transferring " + Package.BinaryURL + " (" + Math.round(Progress * 100) + "%)"}/>;
                    availableBinaries = null;
                    checkDisabled = true;
                    break;
                case "done":
                    updateStatus = Package.PackageName + " " + Package.Version + " was downloaded and replaced, please restart the application to finish update";
                    availableBinaries = null;
                    break;
                default:
                    break;
            }
        }

        const cmdBarItems = [
            {
                key:'update',
                text:'Check for updates',
                disabled:checkDisabled,
                iconProps:{iconName:'CloudDownload'},
                onClick:()=> this.checkUpdates()
            }
        ];

        const {t} = this.props;

        return (
            <Page title={t('nav.about')} barItems={cmdBarItems}>
                {updateStatus &&
                    <PageBlock>
                        <p>{updateStatus}</p>
                        {updateProgress}
                        {availableBinaries &&
                        <ul>{availableBinaries.map(b =>
                            <li key={b.Version}>{b.PackageName} {b.Version} <FabricLink onClick={() =>{this.applyUpdate(b)}}>Download and install</FabricLink></li>
                        )}</ul>
                        }
                    </PageBlock>
                }
                <PageBlock>
                    <h3>About CellsSync</h3>
                    <p>Pydio {currentVersion.PackageName} Beta - {currentVersion.Version} {(!updateStatus && currentVersion.Version) && <FabricLink onClick={() => {this.checkUpdates()}}>Check for updates now</FabricLink> }
                        {currentVersion.Revision &&
                            <Fragment>
                                <br/><span>Revision {currentVersion.Revision} ({currentVersion.BuildStamp})</span>
                            </Fragment>
                        }
                        <br/>© 2019 Abstrium SAS
                        <br/>Pydio is a trademark of Abstrium SAS
                        <br/>More info on <Link href={"https://pydio.com"}/>
                    </p>

                    <h3>Licensing</h3>
                    <p>CellsSync code is licensed under GPL v3. You can find the source code <Link href={"https://github.com/pydio/cells-sync"}/>.</p>

                </PageBlock>
                <PageBlock>
                    <h3>Troubleshooting</h3>

                    <p>Use Cells Home or Cells Enterprise version 2.0 or higher!</p>
                    <ul>
                        <li>If you are using Cells 1.X, please upgrade the server (it is seamless).</li>
                        <li>If you are a user of Pydio 8 (PHP version), please use PydioSync instead.</li>
                    </ul>
                    <p>
                        If you cannot get this tool to work correctly, visit our forum <Link href={"https://forum.pydio.com"}/>. Please provide us the logs so we can help you!
                    </p>

                    <h3>Getting Enterprise support</h3>

                    <p>Learn how to get Pydio enterprise support on <Link href={"https://pydio.com"}/>.
                    </p>

                </PageBlock>
            </Page>
        );
    }
}

export default withTranslation()(PageAbout)
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
import React from "react";
import Storage from "./Storage";
import {Depths} from "@uifabric/fluent-theme";
import {withTranslation} from "react-i18next";

class CallbackPage extends React.Component {

    constructor(props){
        super(props);
        this.state = {};
    }

    componentDidMount() {
        const crtConfig = Storage.getCurrentConfig();
        if(!crtConfig){
            this.errorCallback("Cannot find config");
            return;
        }
        const {serverUrl} = crtConfig;
        const userManager = Storage.getManagerForCurrent();

        userManager.signinRedirectCallback()
            .then((user) => {
                Storage.getInstance(this.props.socket).storeServer(serverUrl, user);
                this.redirect();
            }).catch((error) => {
                this.errorCallback(error.message)
            });

    }

    errorCallback(error){
        this.setState({error: error});
        this.redirect();
    }

    redirect(){
        if(localStorage.getItem("closeAfterCallback")){
            this.setState({canClose: true});
            window.close();
            return;
        }
        Storage.getCurrentConfig();
        const editState = Storage.getLastEditState();
        if(editState && editState.create){
            this.props.history.push('/tasks/create');
        } else if (editState && editState.edit) {
            this.props.history.push('/tasks/edit/' + editState.edit);
        } else {
            this.props.history.push('/servers');
        }
    }

  render() {
        const {t} = this.props;
        const {error, canClose} = this.state;
        let ct;
        if(error){
            ct = t('callback.error') + ' ' + error
        } else if(canClose){
            ct = t('callback.closewindow');
        } else {
            ct = t('callback.redirect');
        }
        return (
            <div style={{display:'flex', width:'100%', height:'100%', alignItems:'center', justifyContent:'center'}}>
                <div style={{boxShadow:Depths.depth16, backgroundColor:'white', width: 400, fontSize:26, padding: '50px 30px', textAlign:'center'}}>{ct}</div>
            </div>
        );
  }
}

CallbackPage = withTranslation()(CallbackPage);

export default CallbackPage;
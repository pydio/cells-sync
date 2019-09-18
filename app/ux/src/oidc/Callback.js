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
            this.props.history.push('/create');
        } else if (editState && editState.edit) {
            this.props.history.push('/edit/' + editState.edit);
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
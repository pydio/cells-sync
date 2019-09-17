import React from "react";
import Storage from "./Storage";

class CallbackPage extends React.Component {

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
                this.errorCallback(error)
            });

    }

    errorCallback(error){
        console.error(error);
        this.redirect();
    }

    redirect(){
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
    return (
        <div>Redirecting...</div>
    );
  }
}

export default CallbackPage;
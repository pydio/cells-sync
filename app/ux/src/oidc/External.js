import React from "react";
import Storage from "./Storage";

class External extends React.Component {

    componentDidMount() {
        localStorage.setItem("closeAfterCallback", "true");
        const newUrl = window.location.search.replace('?manager=', '');
        const userManager = Storage.newManager(newUrl);
        userManager.signinRedirect().catch(e => {
            this.errorCallback(e)
        });
    }

    errorCallback(error){
        this.setState({error: error});
    }


  render() {
        if(this.state && this.state.error){
            return (
                <div>Error while redirecting {this.state.error}</div>
            );
        } else {
            return (
                <div>Redirecting...</div>
            );
        }
  }
}

export default External;
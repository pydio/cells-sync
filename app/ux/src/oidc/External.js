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
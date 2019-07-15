// Declare keys for the sake of auto-completion

import {Patch} from "./Patch";

class Settings {

    Logs = {
        Folder: "",
        MaxFilesNumber: 1,
        MaxFilesSize: 30,
        MaxAgeDays: 30
    };
    Updates = {
        Frequency: "restart",
        DownloadAuto: true,
        UpdateChannel: "",
        UpdateUrl: "",
        UpdatePublicKey: ""
    };

    constructor(data) {
        if (data && data.Logs) {
            this.Logs = data.Logs;
        }
        if (data && data.Updates) {
            this.Updates = data.Updates;
        }
    }

    parseResponse(prom) {
        return prom.then(response => {
            if (response.status !== 200) {
                console.log(response);
                return response.json().then(data => {
                    console.log(data);
                    if(data && data.error) {
                        throw new Error(data.error);
                    }
                });
            }
            return response.json();
        }).then(data => {
            this.Logs = data.Logs;
            this.Updates = data.Updates;
            return this;
        });
    }

    load(){
        return this.parseResponse(window.fetch('http://localhost:3636/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'omit'
        }));
    }

    save(){
        return this.parseResponse(window.fetch('http://localhost:3636/config', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'omit',
            body: JSON.stringify(this)
        }));
    }

}

export default Settings;
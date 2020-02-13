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

import buildUrl from './Url'

const Config = {
    UUID:"",
    Config:{
        Label:"",
        Uuid:"",
        LeftURI:"http://",
        RightURI:"fs://",
        Direction:"Bi",
        Realtime: true,
        LoopInterval:"",
        HardInterval:"",
        SelectiveRoots:null,
    },
    Status:0,
    LastSyncTime:"2019-05-03T11:54:40.775684+02:00",
    LastProcessStatus:{
        IsError:false,
        StatusString:"Task Idle",
        Progress:0
    },
    LeftInfo:{
        Connected:false,
        WatcherActive:false,
        LastConnection:"2019-05-03T11:54:37.772312+02:00",
        Stats:{	HasChildrenInfo: false, HasSizeInfo:false, Size: 0, Children:0, Folders: 0, Files:0},
    },
    RightInfo:{
        Connected:false,
        WatcherActive:false,
        LastConnection:"2019-05-03T11:54:37.772312+02:00",
        Stats:{	HasChildrenInfo: false, HasSizeInfo:false, Size: 0, Children:0, Folders: 0, Files:0},
    }
};

class DefaultDirLoader {
    loaded = false;
    defaultDir = "";

    static getInstance(){
        if (!DefaultDirLoader.instance){
            DefaultDirLoader.instance = new DefaultDirLoader();
        }
        return DefaultDirLoader.instance
    }

    onDefaultDir(){
        if (this.loaded){
            return Promise.resolve(this.defaultDir)
        } else {
            return this.load().then(node => {
                this.defaultDir = node.Path;
                return node.Path;
            })
        }
    }

    load(){
        return window.fetch(buildUrl('/default'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'omit',
            body: JSON.stringify({
                EndpointURI: "fs://",
            })
        }).then(response => {
            this.loaded = true;
            if (response.status === 500) {
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
            return data.Node || {Path:''};
        }).catch(reason => {
            this.loaded = true;
            console.log(reason);
            throw reason;
        });
    }
}

export {Config, DefaultDirLoader}
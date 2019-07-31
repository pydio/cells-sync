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

const Config = {
    UUID:"",
    Config:{
        Label:"New Task",
        Uuid:"",
        LeftURI:"http://",
        RightURI:"fs:///",
        Direction:"Bi",
        Realtime: true,
        LoopInterval:"",
        HardInterval:"",
        SelectiveRoots:undefined,
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

export {Config}
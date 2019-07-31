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
class Operation {
    constructor(data){
        this.OpType = data.OpType;
        this.Dir = data.Dir;
        this.ErrorString = data.ProcessingErrorString;
    }
}

class Conflict extends Operation {
    constructor(data){
        super(data);
        this.ConflictType = data["ConflictType"];
        if(data["LeftOp"]){
            this.LeftOp = new Operation(data["LeftOp"]);
        }
        if(data["RightOp"]){
            this.RightOp = new Operation(data["RightOp"]);
        }
    }
}

class PatchNode {
    constructor(data){
        this.Path = data.Path;
        this.Type = data.Type;
        this.Size = data.Size;
        this.Etag = data.Etag;
        this.MTime = new Date(data.MTime * 1000);
    }
}

class PatchTreeNode {

    constructor(data, timeStamp = undefined){
        this.Base = data.Base;
        if(data.Node){
            this.Node = new PatchNode(data.Node);
        } else {
            this.Node = new PatchNode({});
        }
        if (timeStamp){
            this.Stamp = new Date(timeStamp * 1000);
        }
        if (data.Children){
            this.Children = data.Children.map(child => {
                return new PatchTreeNode(child);
            })
        } else {
            this.Children = [];
        }
        if (data.DataOperation) {
            this.DataOperation = new Operation(data.DataOperation)
        }
        if (data.PathOperation) {
            this.PathOperation = new Operation(data.PathOperation)
        }
        if (data.Conflict) {
            this.Conflict = new Conflict(data.Conflict);
        }
        if (data.MoveTargetPath) {
            this.MoveTargetPath = data.MoveTargetPath
        }
        if (data.MoveSourcePath) {
            this.MoveSourcePath = data.MoveSourcePath
        }
    }

    hasOperations() {
        if(this.DataOperation || this.PathOperation || this.Conflict) {
            return true
        }
        for (let i = 0; i < this.Children.length; i++) {
            if(this.Children[i].hasOperations()) {
                return true
            }
        }
        return false
    }

}

class Patch {
    constructor(data, timeStamp = undefined) {
        this.Root = new PatchTreeNode(data.Root, timeStamp);
        this.Stats = data.Stats;
    }
}

/**
 *
 * @param offset
 * @param limit
 * @return Promise
 */
function load(syncUuid, offset = 0, limit = 10) {
    return window.fetch('http://localhost:3636/patches/' + syncUuid + '/' + offset + '/' + limit, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'omit'
    }).then(response => {
        return response.json();
    }).then(data => {
        const patches = Object.keys(data).map(k => {
            return new Patch(data[k], k);
        });
        return patches || [];
    }).catch(reason => {
        try{
            const data = JSON.parse(reason.message);
            if (data.error) {
                throw data.error;
            }
        }catch (e) {}
        throw reason;
    });
}

export {load, Patch}
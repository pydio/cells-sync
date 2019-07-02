

class Operation {
    constructor(data){
        this.OpType = data.OpType;
        this.Dir = data.Dir;
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
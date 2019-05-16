import 'whatwg-fetch'
import basename from "basename";

class TreeNode {
    constructor(name, loader, parent = null, onChange = null){
        this.loader = loader;
        this.loading = false;
        this.loaded = false;
        this.name = name;
        this.parent = parent;
        this.children = [];
        this.onChange = onChange;
        this.collapsed = true;
    }
    load(){
        this.loading = true;
        this.loaded = false;
        this.notify();
        this.loader.ls(this.name).then(children => {
            children.forEach(child => {
                if (child.Type === 'COLLECTION'){
                    this.appendChild(child.Path);
                }
            });
            this.loading = false;
            this.loaded = true;
            if(!this.parent){
                this.collapsed = false;
            }
            this.notify();
        });
    }
    notify(){
        if(this.parent){
            this.parent.notify();
        }
        if(this.onChange){
            this.onChange();
        }
    }
    appendChild(name){
        const c = new TreeNode(name, this.loader, this);
        this.children.push(c);
        return c;
    }
    getPath(){
        return this.name;
    }
    getName() {
        return basename(this.name) || 'Select Folders';
    }
    isLoaded(){
        return this.loaded;
    }
    isLoading(){
        return this.loading;
    }
    isCollapsed(){
        return this.collapsed;
    }
    setCollapsed(c){
        this.collapsed = c;
    }
    getChildren(){
        return this.children;
    }
    walk(cb){
        cb(this);
        this.children.forEach(c => {
            c.walk(cb)
        });
    }
}

class Loader {
    constructor(uri) {
        this.uri = uri;
    }
    ls(path) {
        return window.fetch('http://localhost:3636/tree', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'omit',
            body: JSON.stringify({
                EndpointURI: this.uri,
                Path: path,
            })
        }).then(response => {
            return response.json();
        }).then(data => {
            return data.Children || [];
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
}

export {TreeNode, Loader}
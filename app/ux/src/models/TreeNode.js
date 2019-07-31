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
    load(initialPath = undefined){
        this.loading = true;
        this.loaded = false;
        this.notify();
        return this.loader.ls(this.name).then(children => {
            let nextChild;
            children.forEach(child => {
                if (child.Type === 'COLLECTION'){
                    const treeChild = this.appendChild(child.Path);
                    if(initialPath !== undefined && initialPath.indexOf('/' + child.Path) === 0 && initialPath !== '/' + child.Path) {
                        nextChild = treeChild;
                    }
                }
            });
            this.loading = false;
            this.loaded = true;
            if(!this.parent || initialPath){
                this.collapsed = false;
            }
            if(nextChild) {
                nextChild.load(initialPath);
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
            return data.Children || [];
        }).catch(reason => {
            console.log(reason);
            throw reason;
        });
    }
}

export {TreeNode, Loader}
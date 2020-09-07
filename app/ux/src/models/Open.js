import parse from "url-parse";

function uriToOpenLink(uri){
    let data = parse(uri);
    data.query = {};
    if (data.protocol === 'fs:') {
        return {url: data.toString().replace('fs://', ''), isFs: true}
    } else if(data.protocol.indexOf('http') === 0) {
        return {url: data.toString(), isFs: false}
    }
    return {};
}

function bestRootForOpen(task) {
    const {url, isFs} = uriToOpenLink(task.Config.LeftURI);
    if (url && isFs){
        return url;
    } else {
        const {url:url2} = uriToOpenLink(task.Config.RightURI);
        if (url2) {
            return url2
        }
    }
    return "";
}

export function openPath(path, task, isURI = false){
    let lnk = path;
    if (!isURI) {
        // Detect best option: if FS, use FS, otherwise use HTTP
        let root = bestRootForOpen(task);
        if (!root) {
            return;
        }
        lnk = root + '/' + path;
    }
    if (window.linkOpener) {
        window.linkOpener.open(lnk);
    } else {
        window.open(lnk);
    }

}


import parse from 'url-parse'

const DEBUG_UX_PORT = '3000';
const DEBUG_APP_PORT = '3636';

export default function Url(pathname = '', websocket = false) {
    const parsed = parse(window.location.href);
    parsed.pathname = pathname;
    parsed.query = {};
    if (parsed.port === DEBUG_UX_PORT) {
        // This is a debug mode, use 3636 instead
        parsed.port = DEBUG_APP_PORT;
        parsed.host = parsed.hostname + ':' + parsed.port;
    }
    if (websocket){
        if (parsed.protocol === 'https:'){
            parsed.protocol = 'wss:'
        } else {
            parsed.protocol = 'ws:'
        }
    }
    return parsed.toString()
}
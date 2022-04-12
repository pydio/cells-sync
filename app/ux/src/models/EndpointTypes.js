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

import parse from 'url-parse'

export default [
    { key: 'http', icon: 'Server'},
    { key: 'fs', icon : 'SyncFolder'},
    { key: 's3', icon: 'SplitObject'}/*,
    /* Disabled as we removed the dependency to router in the service
    { key: 'router', icon: 'ServerEnviroment'}*/
];

export function parseUri(uri, location, parser) {
    if(uri.indexOf('fs:///') === 0) {
        const copy = uri.replace('fs:///', 'fs://host/')
        const result = parse(copy, location, parser)
        result.set('hostname', '')
        return result;
    }
    return parse(uri, location, parser)
}
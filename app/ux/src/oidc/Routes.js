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
import React from 'react'
import { Route } from 'react-router-dom'
import AccountsList from '../components/AccountsList'
import External from './External'
import CallbackPage from './Callback'

export default function Routes(props) {
    const {match, socket} = props;
  return (
    <React.Fragment>
      <Route path={match.path} exact={true} render={(p)=><AccountsList {...p} socket={socket}/>}/>
      <Route path={`${match.path}/callback`}  render={(p)=><CallbackPage {...p} socket={socket}/>} />
      <Route path={`${match.path}/external`}  render={(p)=><External {...p} socket={socket}/>} />
    </React.Fragment>
  );
}
import React from 'react'
import { Route } from 'react-router-dom'
import Servers from './Servers'
import CallbackPage from './Callback'

export default function Routes(props) {
    const {match, socket} = props;
  return (
    <React.Fragment>
      <Route path={match.path} exact={true} render={(p)=><Servers {...p} socket={socket}/>}/>
      <Route path={`${match.path}/callback`}  render={(p)=><CallbackPage {...p} socket={socket}/>} />
    </React.Fragment>
  );
}
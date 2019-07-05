import React from 'react'

class Debugger extends React.Component {
    render() {
        const h = document.documentElement.clientHeight - 48
        return (
            <iframe style={{border: 0, height: h, width:'100%', marginLeft:-22, marginRight:-32}} src={"http://localhost:6060/debug/pprof"} title={"debugger"}/>
        );
    }
}

export default Debugger
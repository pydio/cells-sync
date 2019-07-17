import React from 'react'
import {Link} from 'office-ui-fabric-react'

export default function ({href, label}) {
    const lab = label || href;
    if (window.linkOpener){
        return(<Link href={href} onClick={()=>{window.linkOpener.open(href)}} target={"_blank"}>{lab}</Link>);
    } else{
        return(<Link href={href} target={"_blank"}>{lab}</Link>);
    }
}
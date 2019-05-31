import React from 'react'

export default function ({href, label}) {
    const lab = label || href;
    if (window.linkOpener){
        return(<a href={href} onClick={()=>{window.linkOpener.open(href)}} target={"_blank"}>{lab}</a>);
    } else{
        return(<a href={href} target={"_blank"}>{lab}</a>);
    }
}
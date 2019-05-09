import {Icon} from "office-ui-fabric-react";
import React from "react";

function renderOptionWithIcon(option){
    return (
        <div>
            {option.data && option.data.icon && (
                <Icon style={{ marginRight: '8px' }} iconName={option.data.icon} aria-hidden="true" title={option.data.icon} />
            )}
            <span>{option.text}</span>
        </div>
    );
}

function renderTitleWithIcon(options){
    return renderOptionWithIcon(options[0]);
}

export {renderOptionWithIcon, renderTitleWithIcon}
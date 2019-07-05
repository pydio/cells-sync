import React from 'react'
import Page from "./Page";
import {
    Label,
    Stack,
    TextField,
    Separator,
    Toggle,
    SpinButton,
    DefaultButton,
    PrimaryButton, Dropdown
} from "office-ui-fabric-react";
import {withTranslation} from "react-i18next";

class PageSettings extends React.Component {
    render() {
        const {t, i18n} = this.props;
        return (
            <Page title={"Settings"} legend={"Global settings of the application - (TODO)"}>
                <Separator styles={{root:{margin: '30px 0'},content:{fontSize:16}}}>Language</Separator>
                <Dropdown
                    selectedKey={i18n.language}
                    onChange={(ev, item) => {
                        i18n.changeLanguage(item.key);
                    }}
                    options={[{key:'en', text:'English'}, {key:'fr', text:'Français'}]}
                />

                <Separator styles={{root:{margin: '30px 0'},content:{fontSize:16}}}>Application Update</Separator>
                <Toggle
                    label={"Automatic Checks"}
                    defaultChecked={true}
                    onText={"Enabled"}
                    offText={"Disabled"}
                    onChange={(e, v) => {}}
                />
                <Label>Check every... (days)</Label>
                <SpinButton placeholder={"Number of days"} type={"number"} value={1} onChange={(e, v) => {}}/>
                <Toggle
                    label={"Download and install automatically"}
                    defaultChecked={false}
                    onText={"Yes"}
                    offText={"No"}
                    onChange={(e, v) => {}}
                />

                <Separator styles={{root:{margin: '30px 0'},content:{fontSize:16}}}>Logs</Separator>
                <TextField label={"Store logs in the following folder"} placeholder={"Folder location"}/>
                <Label>Number of log files kept</Label>
                <SpinButton placeholder={"Number"} type={"number"} value={8} onChange={(e, v) => {}}/>
                <Label>Maximum size for log files</Label>
                <SpinButton placeholder={"Number"} type={"number"} value={4000000} onChange={(e, v) => {}}/>

                <Stack horizontal tokens={{childrenGap: 8}} horizontalAlign="center" styles={{root:{marginTop: 30}}}>
                    <DefaultButton text={t('button.cancel')} onClick={()=>{}}/>
                    <PrimaryButton text={t('button.save')} onClick={() => {}}/>
                </Stack>

            </Page>
        );
    }
}

PageSettings = withTranslation()(PageSettings);
export default PageSettings
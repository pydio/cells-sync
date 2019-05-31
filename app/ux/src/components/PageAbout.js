import React from 'react'
import Page from "./Page";
import Link from "./Link"

class PageAbout extends React.Component {
    render() {
        return (
            <Page title={"About Cells Sync"}>

                <div>
                    <h3>About PydioSync</h3>
                    <p>CellsSync v2.2.0 - Build 57d5421535b04458f3417f24856398ff834d130e (release) - January 10 2019
                        <br/>© 2015 Abstrium SAS
                        <br/>Pydio is a trademark of Abstrium SAS
                        <br/>More info on <Link href={"https://pydio.com"}/>
                    </p>

                    <h3>Troubleshooting</h3>

                    <p>If you are an end-user please contact your administrator to get help!</p>
                    <p>If you are an administrator, please make sure to meet the following requirements on the server:</p>
                    <ul>
                        <li>Use Pydio server version 6 or above</li>
                        <li>Enable RewriteRule mechanism and make sure the RESTful API is working correctly</li>
                        <li>Add indexation and <em>meta.syncable</em> aspects to the workspaces you want to be syncable
                        </li>
                        <li>If on Https (recommended), do not use a self-signed SSL certificate.</li>
                    </ul>
                    If you still cannot get this tool to work correctly, please visit our forum <Link href={"https://forum.pydio.com"}/>.
                    Please provide us the logs so we can help you!
                    <p></p>

                    <h3>Getting Enterprise support</h3>

                    <p>Learn how to get Pydio enterprise support on <Link href={"https://pydio.com"}/>.
                    </p>

                    <h3>Licensing</h3>
                    <p>CellsSync code is licensed under GPL v3. You can find the source code <Link href={"https://github.com/pydio/sync"}/>.</p>
                </div>

            </Page>
        );
    }
}

export default PageAbout
import React from 'react'
import Page from "./Page";
import Link from "./Link"

class PageAbout extends React.Component {
    render() {
        return (
            <Page title={"About Cells Sync"}>

                <div>
                    <h3>About CellsSync</h3>
                    <p>Pydio CellsSync Beta
                        <br/>© 2019 Abstrium SAS
                        <br/>Pydio is a trademark of Abstrium SAS
                        <br/>More info on <Link href={"https://pydio.com"}/>
                    </p>

                    <h3>Troubleshooting</h3>

                    <p>
                        Use Cells Home or Cells Enterprise version 2.0 or higher!
                        <ul>
                            <li>If you are using Cells 1.X, please upgrade the server (it is seamless).</li>
                            <li>If you are a user of Pydio 8 (PHP version), please use PydioSync instead.</li>
                        </ul>
                    </p>
                    <p>
                        If you cannot get this tool to work correctly, visit our forum <Link href={"https://forum.pydio.com"}/>. Please provide us the logs so we can help you!
                    </p>

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
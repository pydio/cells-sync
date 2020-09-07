import React from 'react'
import {
    Link,
    ScrollablePane,
    Spinner,
    SpinnerSize,
    Sticky,
    StickyPositionType
} from "office-ui-fabric-react";
import PatchNode from "./PatchNode";
import {withTranslation} from "react-i18next";

class PatchActivities extends React.Component {

    render() {

        const {patches, t, loading, loadMore, openPath} = this.props;

        return (
            <ScrollablePane styles={{contentContainer:{maxHeight:350, backgroundColor:'#fafafa'}}}>
                <Sticky stickyPosition={StickyPositionType.Header}>
                    <div style={{borderBottom: '1px solid #EEEEEE', backgroundColor: '#F5F5F5', fontFamily: 'Roboto Medium', display:'flex', alignItems:'center', padding:'8px 0'}}>
                        <span style={{flex: 1, paddingLeft: 8}}>{t('patch.header.nodes')}</span>
                        <span style={{width: 130, marginRight: 8, textAlign:'center'}}>{t('patch.header.operations')}</span>
                    </div>
                </Sticky>
                {patches &&
                patches.map((patch, k) => {
                    return (
                        <div key={k} style={{paddingBottom: 2, borderTop: k > 0 ? '1px solid #e0e0e0' : null}}>
                            <PatchNode
                                patch={patch.Root}
                                stats={patch.Stats}
                                level={0}
                                open={k === 0}
                                openPath={openPath}
                                flatMode={false}
                                patchError={patch.Error}
                            />
                        </div>
                    );
                })
                }
                {!loading && loadMore &&
                <div style={{padding: 10, textAlign:'center'}}><Link onClick={loadMore}>{t('patch.more.load')}</Link></div>
                }
                {loading &&
                <div style={{height:(patches && patches.length?50:400), display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <Spinner size={SpinnerSize.large} />
                </div>
                }
            </ScrollablePane>

        );
    }

}

PatchActivities = withTranslation()(PatchActivities);
export {PatchActivities as default}
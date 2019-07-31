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
import React, {Fragment} from 'react'
import moment from 'moment'
import {withTranslation} from 'react-i18next'
import {TextField, Dropdown, DefaultButton, Dialog, DialogFooter, DialogContent, PrimaryButton, Label, Icon} from 'office-ui-fabric-react'

class Schedule extends React.Component {

    constructor(props) {
        super(props);
        const {schedule} = props;
        if(schedule){
            this.state = Schedule.parseIso8601(schedule);
        } else {
            this.state = {frequency: 'manual'};
        }
        this.state['open'] = false;
    }

    componentWillReceiveProps(newProps){
        const {schedule} = newProps;
        if(schedule){
            this.setState(Schedule.parseIso8601(schedule));
        } else {
            this.setState({frequency: 'manual'});
        }
    }

    updateJob(){
        const {onChange} = this.props;
        const s = Schedule.makeIso8601FromState(this.state);
        console.log(s);
        onChange(s);
        this.setState({open: false});
    }

    static parseIso8601(value){
        if (value === '' || value.indexOf('/') === -1){
            return {frequency: 'manual'};
        }
        const s = value.split('/');
        if (s.length < 3) {
            return {error: 'Cannot parse value ' + value};
        }
        const d = s[1];
        const i = s[2];
        const startDate = new Date(d);
        if(i === 'P1M'){
            return {frequency:'monthly', monthday: startDate.getDate(), daytime: startDate};
        } else if(i === 'P7D') {
            const m = moment(startDate);
            return {frequency: 'weekly', weekday: m.day(), daytime: startDate};
        } else if(i === 'PT24H' || i === 'P1D') {
            return {frequency: 'daily', daytime: startDate}
        } else {
            const d = moment.duration(i);
            if(d.isValid()){
                const minutes = d.minutes() + d.hours() * 60;
                return {frequency: 'timely', everyminutes: minutes};
            } else {
                return {error: 'Cannot parse value ' + value};
            }
        }
    }

    static makeIso8601FromState(state){
        const {frequency, monthday, weekday, daytime, everyminutes} = state;
        let startDate = new Date('2012-01-01T00:00:00.828696-07:00');
        let duration = moment.duration(0);
        switch (frequency) {
            case "manual":
                return "";
            case "monthly":
                if(daytime){
                    startDate.setTime(daytime.getTime());
                }
                startDate.setDate(monthday || 1);
                duration = moment.duration(1, 'months');
                break;
            case "weekly":
                if(daytime){
                    startDate.setTime(daytime.getTime());
                }
                const m = moment(startDate);
                m.day(weekday === undefined ? 1 : weekday);
                startDate = m.toDate();
                duration = moment.duration(7, 'days');
                break;
            case "daily":
                if(daytime){
                    startDate.setTime(daytime.getTime());
                }
                duration = moment.duration(24, 'hours');
                break;
            case "timely":
                duration = moment.duration(everyminutes, 'minutes');
                break;
            default:
                break
        }
        return 'R/' + moment(startDate).toISOString() + '/' + duration.toISOString();
    }

    changeFrequency(f){
        let {monthday, weekday, daytime, everyminutes} = this.state;
        if(monthday === undefined){
            monthday = 1;
        }
        if(weekday === undefined){
            weekday = 1;
        }
        if(daytime === undefined){
            daytime = moment();
            daytime.year(2012);
            daytime.hours(9);
            daytime.minutes(0);
            daytime = daytime.toDate();
        }
        if(everyminutes === undefined){
            everyminutes = 15
        }
        this.setState({frequency: f, monthday, weekday, daytime, everyminutes});
    }


    static makeReadableString(t, state, short = false){
        const {frequency, monthday, weekday, daytime, everyminutes} = state;
        let dTRead = '0:00';
        if(daytime){
            dTRead = moment(daytime).format('H:mm');
        }
        switch (frequency) {
            case "manual":
                return t("schedule.type.manual");
            case "monthly":
                if(short){
                    return t("schedule.monthly.short").replace('%1', monthday);
                } else {
                    return t("schedule.monthly").replace('%1', monthday).replace('%2', dTRead);
                }
            case "weekly":
                if(short){
                    return t("schedule.weekly.short").replace('%1', moment.weekdays()[weekday]);
                } else {
                    return t("schedule.weekly").replace('%1', moment.weekdays()[weekday]).replace('%2', dTRead);
                }
            case "daily":
                if(short){
                    return t("schedule.daily.short").replace('%1', dTRead);
                } else {
                    return t("schedule.daily").replace('%1', dTRead);
                }
            case "timely":
                const duration = moment.duration(everyminutes, 'minutes');
                return t("schedule.timely").replace('%1', (duration.hours()?duration.hours()+'H':'') + (duration.minutes()?duration.minutes()+'mn':''));
            default:
                return "Error"
        }
    }

    render() {
        const {t, label, displayType, hideManual} = this.props;
        const {open, frequency, monthday, weekday, daytime, everyminutes} = this.state;
        let monthdays = [];
        let weekdays = moment.weekdays();
        for (let i = 1;i<=31; i++){
            monthdays.push(i);
        }
        let handle;
        if (displayType === 'icon'){
            handle = <Icon iconName={"Edit"} onClick={() => this.setState({open:true})} styles={{root:{cursor:'pointer'}}}/>
        } else {
            handle = (
                <TextField
                    label={label}
                    onClick={() => this.setState({open:true})}
                    onFocus={() => this.setState({open:true})}
                    readOnly={true}
                    value={Schedule.makeReadableString(t, this.state, false)}
                />
            );
        }
        let frequencies = ['manual', 'monthly', 'weekly', 'daily', 'timely'];
        if (hideManual){
            frequencies = ['monthly', 'weekly', 'daily', 'timely'];
        }

        return (
            <Fragment>
                {handle}
                <Dialog
                    title={label}
                    hidden={!open}
                    modalProps={{isBlocking:true}}
                    onDismiss={()=>{this.setState({open: false})}}
                >
                    <DialogContent styles={{inner:{padding: 0, paddingBottom: 10}, title:{display: 'none'}}}>
                        <Dropdown
                            label={t('schedule.type')}
                            selectedKey={frequency}
                            onChange={(e,val) => {this.changeFrequency(val.key)}}
                            options={frequencies.map(v => {
                                return {key:v, text:t('schedule.type.' + v)}
                            })}
                        />
                        {frequency === 'monthly' &&
                            <Dropdown
                                label={t('schedule.detail.monthday')}
                                selectedKey={monthday}
                                onChange={(e,val)=>{this.setState({monthday:val.key})}}
                                options={monthdays.map((m)=>{
                                    return {key:m, text: m}
                                })}
                            />
                        }
                        {frequency === 'weekly' &&
                            <Dropdown
                                label={t('schedule.detail.weekday')}
                                selectedKey={weekday}
                                onChange={(e,val)=>{this.setState({weekday:val.key})}}
                                options={weekdays.map((m, k)=>{
                                    return {key:k, text: m}
                                })}
                            />
                        }
                        {(frequency === 'daily' || frequency === 'monthly' || frequency === 'weekly') &&
                            <Fragment>
                                <Label>{t('schedule.detail.daytime')}</Label>
                                <div style={{display:'flex', alignItems:'center'}}>
                                    <TextField
                                        value={moment(daytime).format('HH')}
                                        type={"number"}
                                        onChange={(e, val) => {
                                            const d = new Date();
                                            d.setTime(daytime.getTime());
                                            d.setHours(parseInt(val));
                                            this.setState({daytime: d});
                                        }}
                                    />
                                    <span style={{margin:'0 5px'}}>:</span>
                                    <TextField
                                        value={moment(daytime).format('mm')}
                                        type={"number"}
                                        onChange={(e, val) => {
                                            const d = new Date();
                                            d.setTime(daytime.getTime());
                                            d.setMinutes(parseInt(val));
                                            this.setState({daytime: d});
                                        }}
                                    />
                                </div>

                            </Fragment>
                        }
                        {frequency === 'timely' &&
                            <TextField
                                label={t('schedule.detail.minutes')}
                                value={everyminutes}
                                type={"number"}
                                onChange={(e,val)=>{this.setState({everyminutes:parseInt(val)})}}
                            />
                        }
                        <div style={{marginTop: 20, backgroundColor: '#ECEFF1', padding: 10}}>
                            <div>{Schedule.makeReadableString(t, this.state, false)}</div>
                            {frequency !== 'manual' && <div style={{fontSize:11, paddingTop: 5}}>ISO8601: {Schedule.makeIso8601FromState(this.state)}</div>}
                        </div>

                    </DialogContent>
                    <DialogFooter>
                        <DefaultButton onClick={()=>{this.setState({open: false})}} text={t('button.cancel')}/>
                        <PrimaryButton onClick={this.updateJob.bind(this)} text={t('button.select')}/>
                    </DialogFooter>
                </Dialog>
            </Fragment>
        );

    }

}

const s1 = Schedule.makeIso8601FromState;
const s2 = Schedule.parseIso8601;
const s3 = Schedule.makeReadableString;
Schedule = withTranslation()(Schedule);
Schedule.makeIso8601FromState = s1;
Schedule.parseIso8601 = s2;
Schedule.makeReadableString = s3;

export default Schedule
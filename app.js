const express = require('express');
const path = require('path');
const cons = require('consolidate');
const ejs = require('ejs');
const { raw } = require('express');
const gtfs = require('./modules/gtfs');
const postgres = require('./modules/pg');

let app = express();
let localport = '3333';
let localhost = 'http://localhost';

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.engine('ejs', cons.ejs);
app.set('view engine', 'ejs');

app.host = app.set('host', process.env.HOST || localhost);
app.port = app.set('port', process.env.PORT || localport);

app.get('/', (req, res) => {
  res.render('sign-selector', { signInfo: {} });
});

app.get('/sign/:signId', async (req, res) => {
  let signId = req.params.signId;
  let signInfo = await postgres.getSignConfig(signId);
  let stations = signInfo[0].stations;
  let directionFilter = signInfo[0].direction;
  let minimumTime = signInfo[0].minimum_time;
  
  gtfs.getStationSchedules(stations, minimumTime, [], [], (schedule) => {
    if (directionFilter && directionFilter != '') {
      schedule = schedule.filter(obj => obj.stopId.includes(directionFilter));
    }
    schedule = schedule.slice(0, signInfo[0].max_arrivals_to_show);
    schedule.unshift({
      rotating: signInfo[0].rotating,
      numArrivals: signInfo[0].max_arrivals_to_show,
      shutOffSchedule: signInfo[0].shutoff_schedule,
      turnOnTime: signInfo[0].turnon_time,
      shutOffTime: signInfo[0].turnoff_time,
      warnTime: signInfo[0].warn_time,
      signOn: signInfo[0].sign_on,
      rotationTime: signInfo[0].rotation_time
    });
    res.json(schedule);
  });
});

app.get('/web/:signId', async (req, res) => {
  let signId = req.params.signId;
  let signInfo = await postgres.getSignConfig(signId);
  let stations = signInfo[0].stations;
  let minimumTime = signInfo[0]['minimum_time'];
  let directionFilter = signInfo[0].direction;

  gtfs.getStationSchedules(stations, minimumTime, [], [], (schedule) => {
    let viewData = {};
    viewData.trackedStations = [];
    for (let stopId of stations) {
      viewData.trackedStations.push(gtfs.stations.find(obj => obj.stopId.includes(stopId)));
    }
    viewData.stations = gtfs.stations;
    viewData.routes = gtfs.routes;
    if (directionFilter && directionFilter != '') {
      viewData.arrivals = schedule.filter(obj => obj.stopId.includes(directionFilter));
    } else {
      viewData.arrivals = schedule;
    }
    viewData.signInfo = signInfo[0];
    res.render('sign', viewData);
  });
});

app.put('/setstops/:signId', async (req, res) => {
  let signId = req.params.signId;
  let stops = req.query.stops.split(',');
  let stopsString = "";
  for (let stop of stops) { stopsString += `"${stop}",` }
  stopsString = stopsString.substr(0, stopsString.length - 1);

  let returnInfo = await postgres.setSignStops(signId, stopsString);
  res.json(returnInfo);
});

app.get('/signinfo/:signId', async (req, res) => {
  let signInfo = await postgres.getSignConfig(req.params.signId);
  console.log(signInfo)
  if (signInfo.length === 0) {
    console.log(`Didn't find sign ${req.params.signId}`);
    res.json({
      error: `There is no sign with code ${req.params.signId}.`
    });

    return;
  }
  res.json(signInfo[0]);
});

app.put('/signinfo/:signId', async (req, res) => {
  let signId = req.params.signId;
  let minTime = req.query.minArrivalTime;
  let warnTime = req.query.warnTime;
  let signDirection = req.query.signDirection;
  let signRotation = req.query.signRotation;
	let numArrivals = req.query.numArrivals;
	let cycleTime = req.query.cycleTime;
	let autoOff = req.query.autoOff;
	let autoOffStart = req.query.autoOffStart;
	let autoOffEnd = req.query.autoOffEnd;

  res.json(await postgres.setSignConfig(
    signId,
    {
      minTime: minTime,
      warnTime: warnTime,
      signDirection: signDirection.toUpperCase(),
      signRotation: signRotation,
      numArrivals: numArrivals,
      cycleTime: cycleTime,
      autoOff: autoOff,
      autoOffStart: autoOffStart,
      autoOffEnd: autoOffEnd
  }));
});

app.put('/signpower/:signid', async (req, res) => {
  let signId = req.params.signid;
  let powerMode = req.query.power;
  res.json(await postgres.setSignPower(signId, powerMode))
});

var server = app.listen(app.get('port'), () => {
  app.address = app.get('host') + ':' + server.address().port;
  console.log('Listening at ' + app.address);
});
const express = require('express');
const path = require('path');
const cons = require('consolidate');
const ejs = require('ejs');
const { raw } = require('express');
const gtfs = require('./modules/gtfs');
const postgres = require('./modules/pg');
const { sign } = require('crypto');
const { getSignInfo } = require('./modules/pg');

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
  gtfs.getStationSchedules(trackingStations, minimumTime, [], [], (schedule) => {
    res.json(schedule.slice(0, 10));
  });
});

app.get('/sign/:signId', async (req, res) => {
  let signId = req.params.signId;
  let signInfo = await postgres.getSignInfo(signId);
  let stations = signInfo[0].stations;
  let directionFilter = signInfo[0].direction;
  let minimumTime = signInfo[0]['minimum_time'];
  gtfs.getStationSchedules(stations, minimumTime, [], [], (schedule) => {
    if (directionFilter) {
      schedule = schedule.filter(obj => obj.stopId.includes(directionFilter));
    }
    res.json(schedule.slice(0, 10));
  });
});

app.get('/web/:signId', async (req, res) => {
  let signId = req.params.signId;
  let signInfo = await postgres.getSignInfo(signId);
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
    if (directionFilter) {
      viewData.arrivals = schedule.filter(obj => obj.stopId.includes(directionFilter));
    } else {
      viewData.arrivals = schedule;
    }
    viewData.signId = signId;
    res.render('index', viewData);
  });
});

app.put('/setstops/:signId', async (req, res) => {
  console.log('running setstops');
  let signId = req.params.signId;
  let stops = req.query.stops.split(',');
  let stopsString = "";
  for (let stop of stops) { stopsString += `"${stop}",` }
  stopsString = stopsString.substr(0, stopsString.length - 1);

  let returnInfo = await postgres.setSignStops(signId, stopsString);
  res.json(returnInfo);
});

app.get('/api/tripupdates', (req, res) => {
  let tripUpdatesArray = []
  let feeds = [];
  if (req.query.feeds) {
    feeds = req.query.feeds.split(',');
  } else {
    feeds = ['ACE'];
  }

  gtfs.getTripUpdates(feeds, tripUpdatesArray, (updatesArray) => {
    res.json(updatesArray);
  });
});

app.get('/api/routes', (req, res) => {
  res.json(gtfs.routes);
});

app.get('/api/stations', (req, res) => {
  res.json(gtfs.stations);
});

app.get('/api/station/:stopid', (req, res) => {
  for (let i = 0; i < stations.length; i ++) {
    if (stations[i].stopId === req.params.stopid) {
      res.json(gtfs.stations[i]);
    }
  }
});

app.put('/api/servicetotrack/:service', (req, res) => {
  trackingService = req.params.service;
});

app.put('/api/stationtotrack/:station', (req, res) => {
  trackingStation = req.params.station;
});

app.get('/api/arrivals/:stopid', (req, res) => {
  // res.json(gtfs.getStationSchedule(req.params.stopId, req.params.service));
  gtfs.getStationSchedule(req.params.stopid, minimumTime, [], [], (schedule) => {
    res.json(schedule.filter(obj => obj.routeId === req.params.service));
  });
});

var server = app.listen(app.get('port'), () => {
  app.address = app.get('host') + ':' + server.address().port;
  console.log('Listening at ' + app.address);
});
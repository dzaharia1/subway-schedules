const express = require('express');
const path = require('path');
const cons = require('consolidate');
const ejs = require('ejs');
const { raw } = require('express');
const gtfs = require('./modules/gtfs');

let app = express();
let localport = '3333';
let localhost = 'http://localhost';

let trackingStation = 'A24';
let trackingService = 'ACE';

app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.engine('ejs', cons.ejs);
app.set('view engine', 'ejs');

app.host = app.set('host', process.env.HOST || localhost);
app.port = app.set('port', process.env.PORT || localport);

app.get('/', (req, res) => {
  gtfs.getStationSchedule(trackingStation, trackingService, () => {
    let viewData = {};
    viewData.stations = gtfs.stations;
    viewData.routes = gtfs.routes;
    viewData.arrivals = gtfs.arrivals;
    console.log(arrivals);
    res.render('index', viewData);
  });
});

app.get('/:stopid/:service', (req, res) => {
  console.log("starting get");
  gtfs.getStationSchedule(req.params.stopid, req.params.service, () => {
    let viewData = {};
    viewData.stations = gtfs.stations;
    viewData.routes = gtfs.routes;
    viewData.arrivals = gtfs.arrivals;
    // res.json(viewData.stations);
    res.render('index', viewData);
  });
});

app.get('/routes', (req, res) => {
  res.json(gtfs.routes);
});

app.get('/stations', (req, res) => {
  res.json(gtfs.stations);
});

app.get('/station/:stopid', (req, res) => {
  for (let i = 0; i < stations.length; i ++) {
    if (stations[i].stopId === req.params.stopid) {
      res.json(gtfs.stations[i]);
    }
  }
});

app.put('/servicetotrack/:service', (req, res) => {
  trackingService = req.params.service;
});

app.put('/stationtotrack/:station', (req, res) => {
  trackingStation = req.params.station;
});

app.get('/tripUpdates', (req, res) => {
  res.json(gtfs.tripUpdates);
});

app.get('/schedule/:stopid/:service', (req, res) => {
  // res.json(gtfs.getStationSchedule(req.params.stopId, req.params.service));
  gtfs.getStationSchedule(req.params.stopid, req.params.service, () => {
    res.json(gtfs.arrivals);
  });
});

var server = app.listen(app.get('port'), () => {
  app.address = app.get('host') + ':' + server.address().port;
  console.log('Listening at ' + app.address);
});
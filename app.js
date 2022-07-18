const express = require('express');
const path = require('path');
const cons = require('consolidate');
const ejs = require('ejs');
const { raw } = require('express');
const gtfs = require('./modules/gtfs');

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
  let viewData = {};
  viewData.stations = gtfs.stations;
  viewData.arrivals = gtfs.getStationSchedule('A24');
  viewData.routes = gtfs.routes;
  res.render('index', viewData);
});

app.get('/routes', (req, res) => {
  res.json(gtfs.routes);
});

app.get('/stations', (req, res) => {
  res.json(gtfs.stations);
});

app.get('/station/:stopid', (req, res) => {
  for (let i = 0; i < gtfs.stations.length; i ++) {
    if (gtfs.stations[i].stopId === req.params.stopid) {
      res.json(gtfs.stations[i]);
    }
  }
});

app.get('/vehicles', (req, res) => {
  res.json(gtfs.vehicles)
});

app.get('/tripUpdates', (req, res) => {
  res.json(gtfs.tripUpdates);
});

app.get('/schedule/:stopId', (req, res) => {
  res.json(gtfs.getStationSchedule(req.params.stopId));
});

var server = app.listen(app.get('port'), () => {
  app.address = app.get('host') + ':' + server.address().port;
  console.log('Listening at ' + app.address);
});
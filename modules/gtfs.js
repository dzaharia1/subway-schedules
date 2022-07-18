const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');
const request = require('request');
const fs = require('fs');

let stationsFile = path.join(__dirname, '../agencyInfo/stops.txt');
let routesFile =  path.join(__dirname, '../agencyInfo/routes.txt');

let vehicles = [];
let tripUpdates = [];
let routes = [];
let stations = [];

const requestSettings = {
    method: 'GET',
    url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    // url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
    headers: {
        "x-api-key": 'NaAY1FHNnu7I49kZeb681az1hn7YW4z68zwnnN8X'
    },
    encoding: null
};

setUpStations();
setUpRoutes();
getRealtimeData();

function setUpStations() {
    fs.readFile(stationsFile, {encoding: 'utf8'}, (err, data) => {
        if (!err) {
            let rawData = CSVToArray(data, ',');
            for (stop of rawData) {
                if (stop[0][3] != 'N' && stop[0][3] != 'S') {
                    let stopObject = {}
                    stopObject.stopId = stop[0];
                    stopObject.stopName = stop[1];
                    stations.push(stopObject);
                }
            }
        } else {
            console.log(err);
        }
        stations.sort((a, b) => (a.stopName > b.stopName) ? 1 : -1);
    });
}

function setUpRoutes() {
  fs.readFile(routesFile, {encoding: 'utf8'}, (err, data) => {
    if (!err) {
        let rawData = CSVToArray(data, ',');
        for (route of rawData) {
            let routeObject = {};
            routeObject.routeId = route[1];
            routeObject.routeName = route[2];
            routeObject.routeLongName = route[3];
            routeObject.color = `#${route[7]}`;
            routes.push(routeObject);
        }
    } else {
      console.log(err);
    }
  });
}

function getRealtimeData () {
  request(requestSettings, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      let gtfsData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
      for (entity of gtfsData.entity) {
        if (entity.vehicle) { vehicles.push(entity) }
        if (entity.tripUpdate) { tripUpdates.push(entity) }
      }
      // getStationSchedule('R14');
    }
  });
}

function getStationSchedule(stopId) {
  let arrivals = [];
  
  for (tripUpdate of tripUpdates) {
    for (stopTimeUpdate of tripUpdate.tripUpdate.stopTimeUpdate) {
      if (stopTimeUpdate.stopId.indexOf(stopId) >= 0){
        let scheduleItem = {};
        let tripId = tripUpdate.tripUpdate.trip.tripId;
        let timeStamp = parseInt(stopTimeUpdate.arrival.time.low) * 1000;
        let arrivalTime = new Date(timeStamp);
        let now = Date.now();
        let minutesUntil = Math.floor((timeStamp - now) / 60000);
        scheduleItem.tripId = tripId;
        scheduleItem.arrivalTime = `${arrivalTime.getHours()}:${arrivalTime.getMinutes()}`;
        scheduleItem.routeId = tripUpdate.tripUpdate.trip.routeId;
        scheduleItem.minutesUntil = minutesUntil;
        scheduleItem.direction = tripId.substring(tripId.length - 1, tripId.length);
        if (scheduleItem.minutesUntil >= 0) {
            arrivals.push(scheduleItem);
        }
      }
    }
  }

  arrivals.sort((a, b) => (a.minutesUntil > b.minutesUntil) ? 1 : -1);
  return arrivals;
}

function getVehicleFromTripID (tripId) {
  for (vehicle of vehicles) {
    if (vehicle.trip.tripId.indexOf(tripId) >= 0) {
      return vehicle;
    }
  }
}

function CSVToArray( strData, strDelimiter ){
    strDelimiter = (strDelimiter || ",");
    var objPattern = new RegExp(
        (
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );
    var arrData = [[]];
    var arrMatches = null;
    while (arrMatches = objPattern.exec( strData )){
        var strMatchedDelimiter = arrMatches[ 1 ];
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){
            arrData.push( [] );
        }
        var strMatchedValue;
        if (arrMatches[ 2 ]){
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );
        } else {
            strMatchedValue = arrMatches[ 3 ];
        }
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }
    return( arrData );
}

exports.vehicles = vehicles;
exports.tripUpdates = tripUpdates;
exports.routes = routes;
exports.stations = stations;
exports.setUpStations = setUpStations;
exports.setUpRoutes = setUpRoutes;
exports.getRealtimeData = getRealtimeData;
exports.getStationSchedule = getStationSchedule;
exports.getVehicleFromTripID = getVehicleFromTripID;
const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');
const request = require('request');
const fs = require('fs');

let stationsFile = path.join(__dirname, '../agencyInfo/stops.txt');
let routesFile =  path.join(__dirname, '../agencyInfo/routes.txt');
let stopTimesFile = path.join(__dirname, '../agencyInfo/stop_times.txt');
let tripsFile = path.join(__dirname, '../agencyInfo/trips.txt');
let newStationsFile = path.join(__dirname, '../agencyInfo/stations.txt');

let vehicles = [];
let tripUpdates = [];
let routes = [];
let stations = [];
let trips = [];

let serviceFeeds = {
    "ace": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
    "bdfm": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
    "g": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
    "j": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
    "nqrw": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
    "l": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
    "1234567": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
    "si": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si"
};

const requestSettings = {
    method: 'GET',
    headers: {
        "x-api-key": 'NaAY1FHNnu7I49kZeb681az1hn7YW4z68zwnnN8X'
    },
    encoding: null
};

setUpTrips();
setUpRoutes();
setUpStations();
getTripUpdates("ace");

function setUpStations() {
    console.log (`creating a list of stations`);
    // start reading the stations file
    fs.readFile(stationsFile, {encoding: 'utf8'}, (err, data) => {
        if (!err) {
            let rawData = CSVToArray(data, ',');
            // for each stop in the list, create a stop object including the stopId and name, and push it to stations[]
            for (stop of rawData) {
                // filter to just parent stations (excluding north and south stops of each station)
                if (stop[0][3] != 'N' && stop[0][3] != 'S') {
                    let stopObject = {}
                    stopObject.stopId = stop[0];
                    stopObject.stopName = stop[1];
                    stopObject.services = [];
                    stations.push(stopObject);
                }
            }
        } else {
            console.log(err);
        }
        stations.sort((a, b) => (a.stopName > b.stopName) ? 1 : -1);
        stations.shift();
        
        // for each station, add the services that go there
        // addServicesToStations();
    });
}

function setUpTrips() {
    console.log(`creating a list of trips`);
    fs.readFile(tripsFile, { encoding: 'utf8' }, (err, data) => {
        if (!err) {
            trips = CSVToArray(data, ',');
        } else {
            console.log(err);
        }
    });
}

function addServicesToStations() {
    console.log(`adding services to stations...`);
    fs.readFile(stopTimesFile, { encoding: 'utf8' }, (err, data) => {
        if (!err) {
            let rawData = CSVToArray(data, ',');
            // for (let i = 0; i < 6; i ++) { console.log(rawData[i][1]); }

            for (station of stations) {
                // if (station.stopId === '') { break; }
                // get all of the stops that are at this station
                let stops = rawData.filter(obj => {
                    if (obj[1]) {
                        return obj[1].indexOf(station.stopId) === 0;
                    } else {
                        return false
                    }
                });
                
                // for every stop of the stops that stop at this station, get the route that that stop is on
                for (stop of stops) {
                    let routeId = trips.find(obj => { return obj[1] === stop[0] })[0];
                    
                    // push the route id to the station's routes list, if it's not there already
                    if (station.services.indexOf(routeId) === -1) {
                        station.services.push(routeId);
                    }
                }
                console.log(station);
                let stationString = `${station.stopId}, ${station.stopName}, ${station.services} \r\n`;
                console.log(stationString);
                fs.appendFileSync(newStationsFile, stationString);
            }
            console.log(`Finished setting up stations list`);

        } else {
            console.log(err);
        }
    });
}

function setUpRoutes() {
    console.log(`creating a list of routes`);
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

function getTripUpdates (service) {
    console.log('refreshing the list of trip updates');
    requestSettings.url = serviceFeeds[service];
    request(requestSettings, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let gtfsData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
            for (entity of gtfsData.entity) {
                if (entity.vehicle) { vehicles.push(entity) }
                if (entity.tripUpdate) { tripUpdates.push(entity) }
            }
        }
    });
}

function getStationSchedule(stopId) {
    console.log('creating station schedule from updates data');
    let arrivals = [];
    getTripUpdates(service);
    
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
exports.getTripUpdates = getTripUpdates;
exports.getStationSchedule = getStationSchedule;
exports.getVehicleFromTripID = getVehicleFromTripID;
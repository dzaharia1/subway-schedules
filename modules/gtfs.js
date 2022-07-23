const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');
const request = require('request');
const fs = require('fs');
const cons = require('consolidate');

let stationsFile = path.join(__dirname, '../agencyInfo/stations.txt');
let routesFile =  path.join(__dirname, '../agencyInfo/routes.txt');

// let tripUpdates = [];
let arrivals = [];
let routes = [];
let stations = [];

let services = [ "ACE", "BDFM", "G", "JZ", "NQRW", "L", "1234566X7", "SI" ];

let feeds = {
    "ACE": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
    "BDFM": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
    "G": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
    "JZ": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
    "NQRW": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
    "L": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
    "1234566X7": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
    "SI": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si"
}

const requestSettings = {
    method: 'GET',
    headers: {
        "x-api-key": 'NaAY1FHNnu7I49kZeb681az1hn7YW4z68zwnnN8X'
    },
    encoding: null
};

setUpStations();
setUpRoutes();
// // getStationSchedule("A24", "ACE");
// getStationSchedule("A24");

function setUpStations() {
    console.log('Setting up stations');
    fs.readFile(stationsFile, {encoding: 'utf8'}, (err, data) => {
        if (!err) {
            let rawData = CSVToArray(data, ',');
            for (let station of rawData) {
                let existingStation = stations.find(obj => obj.name.indexOf(station[1]) > -1);
                if (existingStation) {
                    for (let i = 2; i < station.length; i ++) {
                        if (station[i][0] === ' ') { station[i] = station[i].substr(1) }
                        existingStation.lines.push(station[i]);
                    }
                } else {
                    let stationObject = {};
                    stationObject.stopId = station[0];
                    stationObject.name = station[1];
                    stationObject.lines = []
                    for (let i = 2; i < station.length; i ++) {
                        stationObject.lines.push(station[i].replace(/\s/g, ''));
                    }
                    stationObject.lines.sort((a, b) => (a > b) ? 1 : -1);
                    stations.push(stationObject);
                }
            }
        } else {
            console.error(err);
        }
    });
}

function getFeedsForStation(stopId) {
    let returnArray = [];
    let thisStation = stations.find(obj => obj.stopId.indexOf(stopId) > -1);

    for (let line of thisStation.lines) {
        let lineService = services.find(obj => obj.indexOf(line[0]) > -1 );
        if (!returnArray.includes(lineService)) {
            returnArray.push(lineService);
        }
    }

    return returnArray;
}

function setUpRoutes() {
    console.log('Setting up routes');
  fs.readFile(routesFile, {encoding: 'utf8'}, (err, data) => {
    if (!err) {
        let rawData = CSVToArray(data, ',');
        for (let route of rawData) {
            let routeObject = {};
            routeObject.routeId = route[1];
            routeObject.routeName = route[2];
            routeObject.routeLongName = route[3];
            routeObject.color = `${route[7]}`;
            routeObject.textColor = `${route[8]}`;
            routes.push(routeObject);
        }
        routes.pop();
    } else {
      console.error(err);
    }
  });
}

function getTripUpdates (services, tripUpdatesArray, callback) {
    console.log(`getting updates for`);
    console.log(services);
    service = services[0];
    requestSettings.url = feeds[service];
    request(requestSettings, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let gtfsData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
            for (let entity of gtfsData.entity) {
                if (entity.tripUpdate) { tripUpdatesArray.push(entity); }
            }
            if (services.length > 1) {
                services.shift();
                console.log(`New services array is ${services}`);
                getTripUpdates(services, tripUpdatesArray, callback);
            } else {
                callback();
            }
        } else {
            console.log(error);
        }
    });
}

// function getTripUpdates (service, callback) {
//     let tripUpdates = [];
//     requestSettings.url = feeds[service];
//     request(requestSettings, (error, response, body) => {
//         if (!error && response.statusCode == 200) {
//             let gtfsData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
//             for (let entity of gtfsData.entity) {
//                 if (entity.tripUpdate) { tripUpdates.push(entity) }
//             }
//             callback(tripUpdates);
//         } else {
//             console.error(error);
//         }
//     });
// }

function getStationSchedule(stopId, callback) {
    // get the trip updates for each of the services of the station
    let stationServices = getFeedsForStation(stopId);
    let tripUpdates = [];
    let arrivals = [];
    getTripUpdates(stationServices, tripUpdates, () => {
        console.log(tripUpdates);
    });
    // sort the trip updates
    // prepare the schedule array
    // put the array through the callback function
}

// ~~~~~~~~~~ Get the schedule for a service of a station ~~~~~~~~~~~~~

// function getStationSchedule(stopId, service, callback) {
//     console.log(`Getting ${service} schedule for ${stopId}`);
//     arrivals = [];

//     getTripUpdates(service, () => {
//         for (let tripUpdate of tripUpdates) {
//             for (let stopTimeUpdate of tripUpdate.tripUpdate.stopTimeUpdate) {
//                 if (stopTimeUpdate.stopId.indexOf(stopId) >= 0){
//                     let scheduleItem = {};
//                     let tripId = tripUpdate.tripUpdate.trip.tripId;
//                     let timeStamp = parseInt(stopTimeUpdate.arrival.time.low) * 1000;
//                     let arrivalTime = new Date(timeStamp);
//                     let now = Date.now();
//                     let minutesUntil = Math.floor((timeStamp - now) / 60000);
//                     scheduleItem.arrivalTime = `${arrivalTime.getHours()}:${arrivalTime.getMinutes()}`;
//                     scheduleItem.routeId = tripUpdate.tripUpdate.trip.routeId;
//                     scheduleItem.minutesUntil = minutesUntil;
//                     scheduleItem.direction = tripId.substring(tripId.length - 1, tripId.length);
//                     if (scheduleItem.minutesUntil >= 0) {
//                         arrivals.push(scheduleItem);
//                     }
//                 }
//             }
//         }
//         arrivals.sort((a, b) => (a.minutesUntil > b.minutesUntil) ? 1 : -1);
//         exports.arrivals = arrivals;
//         if (callback) { callback() }
//     });
// }

function getVehicleFromTripID (tripId) {
  for (let vehicle of vehicles) {
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

// exports.arrivals = arrivals;
exports.stations = stations;
exports.routes = routes;
exports.setUpStations = setUpStations;
exports.setUpRoutes = setUpRoutes;
exports.getTripUpdates = getTripUpdates;
exports.getStationSchedule = getStationSchedule;
exports.getVehicleFromTripID = getVehicleFromTripID;
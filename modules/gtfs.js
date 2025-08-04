const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');
const request = require('request');
const fs = require('fs');

let stationsFile = path.join(__dirname, '../agencyInfo/stations.txt');
let routesFile =  path.join(__dirname, '../agencyInfo/routes.txt');
let terminalsFile = path.join(__dirname, '../agencyInfo/terminals.txt');

let routes = [];
let stations = [];
let terminals = [];

let services = [ "ACE", "BDFM", "G", "JZ", "NQRW", "L", "1234566X7GS", "SI" ];

let feeds = {
    "ACE": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
    "BDFM": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
    "G": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
    "JZ": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
    "NQRW": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
    "L": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
    "1234566X7GS": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
    "SI": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si"
}

const requestSettings = {
    method: 'GET',
    encoding: null
};

setUpStations();
setUpRoutes();
setUpTerminals();

function setUpStations() {
    console.log('Setting up stations');
    fs.readFile(stationsFile, {encoding: 'utf8'}, (err, data) => {
        if (!err) {
            let rawData = CSVToArray(data, ',');
            for (let station of rawData) {
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
        } else {
            console.error(err);
        }
    });
}

function getFeedsForStation(stopId) {
    let returnArray = [];
    let thisStation = stations.find(obj => obj.stopId.indexOf(stopId) > -1);

    if (!thisStation) {
        console.error(`No station found for stopId: ${stopId}`);
        return returnArray; // Return empty array if no station found
    }

    console.log('Found station:', thisStation);

    for (let line of thisStation.lines) {
        let lineService = services.find(obj => obj.indexOf(line[0]) > -1 );
        if (!returnArray.includes(lineService)) {
            returnArray.push(lineService);
        }
    }

    return returnArray;
}

function getStopName (stopId) {
    let stopInQuestion = stations.find(obj => stopId.includes(obj.stopId));
    return stopInQuestion.name;
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

function setUpTerminals() {
    console.log("Set up terminals");
    fs.readFile(terminalsFile, {encoding: 'utf8'}, (err, data) => {
        if (!err) {
            let rawData = CSVToArray(data, ',');
            for (let terminal of rawData) {
                terminals.push({
                    "routeId": terminal[0],
                    "terminal": terminal[1],
                    "opposite": terminal[2]
                });
            }
            terminals.pop();
        }
    });
}

function getTripUpdates (services, tripUpdatesArray, callback) {
    if (!services || services.length === 0) {
        return callback(tripUpdatesArray);
    }
    
    let service = services[0];
    let remainingServices = services.slice(1); // Create a copy instead of mutating
    
    requestSettings.url = feeds[service];
    request(requestSettings, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let gtfsData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
            
            for (let entity of gtfsData.entity) {
                if (entity.tripUpdate) { tripUpdatesArray.push(entity); }
            }
            
            if (remainingServices.length > 0) {
                getTripUpdates(remainingServices, tripUpdatesArray, callback);
            } else {
                callback(tripUpdatesArray);
            }
        } else {
            console.log(error);
            // Continue with remaining services even if this one fails
            if (remainingServices.length > 0) {
                getTripUpdates(remainingServices, tripUpdatesArray, callback);
            } else {
                callback(tripUpdatesArray);
            }
        }
    });
}

function getHeadsignforTripUpdate (routeId, trackedStopId, stopTimeUpdates) {
    let destinationStopId = stopTimeUpdates[stopTimeUpdates.length - 1].stopId.substr(0,3);
    let destinationStopName = getStopName(destinationStopId);
    let trackedStopName = getStopName(trackedStopId.substr(0,3));
    
    if (trackedStopId.includes(destinationStopId)) {
        let terminal = terminals.find(obj => obj.terminal == destinationStopId && obj.routeId == routeId[0]);
        if (terminal) {
            return getStopName(terminal.opposite);
        }
        return `From ${destinationStopName}`;
    }
    return destinationStopName;
}

// get the arrivals for each of the stations with stop IDs in the stopIds parameter
function getStationSchedules(stopIds, minimumTime, tripUpdatesArray, arrivalsArray, callback) {
    // Add validation for stopIds
    if (!stopIds || stopIds.length === 0) {
        console.error('No stopIds provided to getStationSchedules');
        return callback(arrivalsArray || []);
    }

    // get the trip updates for each of the services of the station
    let station = stations.find(obj => obj.stopId.includes(stopIds[0]));
    
    if (!station) {
        console.error(`Station not found for stopId: ${stopIds[0]}`);
        // Continue with remaining stops if any
        if (stopIds.length > 1) {
            const [ _, ...othersStopIds ] = stopIds;
            return getStationSchedules(othersStopIds, minimumTime, [], arrivalsArray, callback);
        }
        return callback(arrivalsArray || []);
    }

    let stationServices = getFeedsForStation(stopIds[0]);

    // Create a new tripUpdatesArray for this call to prevent memory leaks
    let currentTripUpdates = [];
    
    getTripUpdates(stationServices, currentTripUpdates, (tripUpdatesArray) => {
        let now = Date.now();
        let currentArrivals = [];
        
        for (let tripUpdate of tripUpdatesArray) {
            let stopTimeUpdates = tripUpdate.tripUpdate.stopTimeUpdate;
            for (let stopTimeUpdate of stopTimeUpdates) {
                if (station.stopId.includes(stopTimeUpdate.stopId.substr(0, 3)) && stopTimeUpdate.arrival) {
                    let scheduleItem = {};
                    let timeStamp = parseInt(stopTimeUpdate.arrival.time.low) * 1000;
                    scheduleItem.minutesUntil = Math.floor((timeStamp - now) / 60000);
                    scheduleItem.stopId = stopTimeUpdate.stopId;
                    scheduleItem.routeId = tripUpdate.tripUpdate.trip.routeId;
                    scheduleItem.headsign = getHeadsignforTripUpdate(scheduleItem.routeId,
                                                                     scheduleItem.stopId,
                                                                     stopTimeUpdates);
                    if (scheduleItem.minutesUntil >= minimumTime) {
                        currentArrivals.push(scheduleItem);
                    }
                }
            }
        }

        // Merge current arrivals with existing ones
        let allArrivals = [...(arrivalsArray || []), ...currentArrivals];

        if (stopIds.length > 1) {
            const [ a, ...othersStopIds ] = stopIds;
            getStationSchedules(othersStopIds, minimumTime, [], allArrivals, callback);
        } else {
            allArrivals.sort((a, b) => (a.minutesUntil > b.minutesUntil) ? 1: -1);
            callback(allArrivals);
        }
    });
}

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
exports.getStationSchedules = getStationSchedules;
exports.getVehicleFromTripID = getVehicleFromTripID;
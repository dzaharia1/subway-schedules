const path = require('path');
const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const https = require('https');
// Use native fetch for Node.js 18+ (you're on 22.11.0)
// const fetch = require('node-fetch');
const fs = require('fs');

// Simple in-memory cache for GTFS data
const gtfsCache = new Map();
const CACHE_TTL = 60 * 1000; // 60 seconds in milliseconds

// Circuit breaker state
const circuitBreaker = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
    threshold: 5, // Number of failures before opening circuit
    timeout: 30000, // 30 seconds before trying again
    resetTimeout: 60000 // 60 seconds before resetting to CLOSED
};

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

// API key for MTA feeds
const API_KEY = process.env.MTA_API_KEY || 'NaAY1FHNnu7I49kZeb681az1hn7YW4z68zwnnN8X';

// Cache management functions
function getCachedData(key) {
    const cached = gtfsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    gtfsCache.delete(key);
    return null;
}

function setCachedData(key, data) {
    gtfsCache.set(key, {
        data: data,
        timestamp: Date.now()
    });
    
    // Clean up old cache entries
    if (gtfsCache.size > 100) { // Limit cache size
        const oldestKey = gtfsCache.keys().next().value;
        gtfsCache.delete(oldestKey);
    }
}

// Circuit breaker functions
function canMakeRequest() {
    const now = Date.now();
    
    if (circuitBreaker.state === 'OPEN') {
        if (now - circuitBreaker.lastFailureTime > circuitBreaker.timeout) {
            circuitBreaker.state = 'HALF_OPEN';
            return true;
        }
        return false;
    }
    
    return true;
}

function recordSuccess() {
    circuitBreaker.failures = 0;
    circuitBreaker.state = 'CLOSED';
}

function recordFailure() {
    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = Date.now();
    
    if (circuitBreaker.failures >= circuitBreaker.threshold) {
        circuitBreaker.state = 'OPEN';
        console.warn('Circuit breaker opened due to multiple failures');
    }
}

// Fetch with timeout using native fetch
async function fetchWithTimeout(url, options, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

setUpStations();
setUpRoutes();
setUpTerminals();

// Initial cache preload will be handled by the interval setup below

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
    return stopInQuestion ? stopInQuestion.name : 'Unknown Station';
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

async function getTripUpdates(services, tripUpdatesArray, callback) {
    if (!services || services.length === 0) {
        callback(tripUpdatesArray);
        return;
    }
    
    // Check cache first
    const cacheKey = `gtfs_${services.sort().join('_')}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        console.log('Using cached GTFS data');
        callback(cachedData);
        return;
    }
    
    // Check circuit breaker
    if (!canMakeRequest()) {
        console.warn('Circuit breaker is open, returning empty data');
        callback([]);
        return;
    }
    
    try {
        // Fetch all services in parallel
        const promises = services.map(async (service) => {
            const requestSettings = {
                method: 'GET',
                headers: {
                    'x-api-key': API_KEY
                }
            };
            
            try {
                console.log(`Fetching GTFS data for service: ${service}`);
                const response = await fetchWithTimeout(feeds[service], requestSettings, 10000);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                console.log(`Received response for ${service}, processing data...`);
                const arrayBuffer = await response.arrayBuffer();
                let gtfsData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));
                
                console.log(`GTFS data structure for ${service}:`, {
                    hasEntity: !!gtfsData.entity,
                    entityType: typeof gtfsData.entity,
                    entityLength: gtfsData.entity ? gtfsData.entity.length : 'N/A'
                });
                
                // Extract only necessary data to prevent memory leaks
                const cleanEntities = [];
                if (gtfsData.entity && Array.isArray(gtfsData.entity)) {
                    for (let entity of gtfsData.entity) {
                        if (entity.tripUpdate) {
                            cleanEntities.push({
                                tripUpdate: {
                                    trip: {
                                        routeId: entity.tripUpdate.trip.routeId
                                    },
                                    stopTimeUpdate: entity.tripUpdate.stopTimeUpdate.map(update => ({
                                        stopId: update.stopId,
                                        arrival: update.arrival ? {
                                            time: update.arrival.time
                                        } : null
                                    }))
                                }
                            });
                        }
                    }
                }
                
                // Clear the large GTFS data object
                gtfsData = null;
                
                console.log(`Successfully processed ${service}, found ${cleanEntities.length} entities`);
                recordSuccess(); // Record successful request
                return cleanEntities;
                
            } catch (error) {
                console.error(`Error fetching ${service}:`, error.message);
                console.error(`Full error:`, error);
                recordFailure(); // Record failed request
                return []; // Return empty array on error
            }
        });
        
        // Wait for all requests to complete
        const results = await Promise.all(promises);
        
        // Flatten results and merge with existing tripUpdatesArray
        const flattenedResults = results.reduce((acc, val) => acc.concat(val), []);
        const allUpdates = [...(tripUpdatesArray || []), ...flattenedResults];
        
        // Cache the result
        setCachedData(cacheKey, allUpdates);
        
        callback(allUpdates);
        
    } catch (error) {
        console.error('Error in getTripUpdates:', error);
        console.error('Error stack:', error.stack);
        recordFailure();
        callback(tripUpdatesArray || []);
    }
    
    // Safety timeout to ensure callback is always called
    setTimeout(() => {
        if (!callback.called) {
            console.warn('Safety timeout triggered, calling callback with empty data');
            callback.called = true;
            callback(tripUpdatesArray || []);
        }
    }, 25000); // 25 seconds safety timeout
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
            let [ _, ...othersStopIds ] = stopIds;
            return getStationSchedules(othersStopIds, minimumTime, [], arrivalsArray, callback);
        }
        return callback(arrivalsArray || []);
    }

    let stationServices = getFeedsForStation(stopIds[0]);

    // Create a new tripUpdatesArray for this call to prevent memory leaks
    let currentTripUpdates = [];
    
    // Add logging to debug the flow
    console.log(`Processing station ${stopIds[0]} with services: ${stationServices.join(', ')}`);
    
    // Add safety timeout for the entire operation
    let callbackCalled = false;
    const safetyTimeout = setTimeout(() => {
        if (!callbackCalled) {
            console.warn(`Safety timeout triggered for station ${stopIds[0]}, calling callback with current data`);
            callbackCalled = true;
            callback(arrivalsArray || []);
        }
    }, 25000); // 25 seconds safety timeout
    
    getTripUpdates(stationServices, currentTripUpdates, (tripUpdatesArray) => {
        console.log(`Received trip updates for ${stopIds[0]}: ${tripUpdatesArray.length} updates`);
        
        let now = Date.now();
        let currentArrivals = [];
        
        for (let tripUpdate of tripUpdatesArray) {
            let stopTimeUpdates = tripUpdate.tripUpdate.stopTimeUpdate;
            for (let stopTimeUpdate of stopTimeUpdates) {
                if (station.stopId.includes(stopTimeUpdate.stopId.substr(0, 3)) && stopTimeUpdate.arrival) {
                    let scheduleItem = {};
                    let timeStamp = parseInt(stopTimeUpdate.arrival.time.low) * 1000;
                    scheduleItem.arrivalTime = new Date(timeStamp).toLocaleTimeString('en-US', {
                        timeZone: 'America/New_York',
                        hour: 'numeric',
                        minute: '2-digit'
                    });
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

        console.log(`Found ${currentArrivals.length} arrivals for ${stopIds[0]}`);

        // Merge current arrivals with existing ones
        let allArrivals = [...(arrivalsArray || []), ...currentArrivals];

        if (stopIds.length > 1) {
            let [ a, ...othersStopIds ] = stopIds;
            console.log(`Processing remaining stops: ${othersStopIds.join(', ')}`);
            clearTimeout(safetyTimeout); // Clear safety timeout for this iteration
            callbackCalled = true; // Mark callback as called for recursive call
            getStationSchedules(othersStopIds, minimumTime, [], allArrivals, callback);
        } else {
            console.log(`Final processing complete, sorting ${allArrivals.length} arrivals`);
            allArrivals.sort((a, b) => (a.minutesUntil > b.minutesUntil) ? 1: -1);
            console.log(`Calling final callback with ${allArrivals.length} arrivals`);
            clearTimeout(safetyTimeout); // Clear safety timeout
            if (!callbackCalled) {
                callbackCalled = true;
                callback(allArrivals);
            }
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

// Export monitoring functions
exports.getCacheStats = () => ({
    size: gtfsCache.size,
    maxSize: 100,
    ttl: CACHE_TTL / 1000,
    refreshIntervalActive: !!cacheRefreshInterval
});

exports.getCircuitBreakerStatus = () => ({
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    threshold: circuitBreaker.threshold,
    lastFailureTime: circuitBreaker.lastFailureTime,
    canMakeRequest: canMakeRequest()
});

// Clear cache function for testing/debugging
exports.clearCache = () => {
    gtfsCache.clear();
    console.log('GTFS cache cleared');
};

// Stop cache refresh interval for testing/debugging
exports.stopCacheRefresh = () => {
    if (cacheRefreshInterval) {
        clearInterval(cacheRefreshInterval);
        cacheRefreshInterval = null;
        console.log('GTFS cache refresh stopped');
    }
};

// Manual cache preload function
exports.preloadCache = () => {
    console.log('Manual cache preload triggered');
    preloadGTFSCache();
};

// Restart cache refresh interval
exports.restartCacheRefresh = () => {
    // Stop existing interval
    if (cacheRefreshInterval) {
        clearInterval(cacheRefreshInterval);
        cacheRefreshInterval = null;
    }
    
    // Start new interval
    cacheRefreshInterval = setInterval(() => {
        console.log('Refreshing GTFS cache...');
        preloadGTFSCache();
    }, 45000); // 45 seconds
    
    console.log('GTFS cache refresh restarted');
};

// Preload cache function
let cacheRefreshInterval = null; // Store interval reference

async function preloadGTFSCache() {
    try {
        console.log('Starting GTFS cache preload...');
        
        // Create a cache key for all services
        const allServicesKey = `gtfs_${services.sort().join('_')}`;
        
        // Check if we already have cached data
        const existingCache = getCachedData(allServicesKey);
        if (existingCache) {
            console.log('Cache already contains data, skipping preload');
            return;
        }
        
        console.log(`Preloading cache for services: ${services.join(', ')}`);
        
        // Fetch data for all services in parallel
        const promises = services.map(async (service) => {
            const requestSettings = {
                method: 'GET',
                headers: {
                    'x-api-key': API_KEY
                }
            };
            
            try {
                console.log(`Preloading ${service}...`);
                const response = await fetchWithTimeout(feeds[service], requestSettings, 15000);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const arrayBuffer = await response.arrayBuffer();
                let gtfsData = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(arrayBuffer));
                
                // Extract only necessary data to prevent memory leaks
                const cleanEntities = [];
                if (gtfsData.entity && Array.isArray(gtfsData.entity)) {
                    for (let entity of gtfsData.entity) {
                        if (entity.tripUpdate) {
                            cleanEntities.push({
                                tripUpdate: {
                                    trip: {
                                        routeId: entity.tripUpdate.trip.routeId
                                    },
                                    stopTimeUpdate: entity.tripUpdate.stopTimeUpdate.map(update => ({
                                        stopId: update.stopId,
                                        arrival: update.arrival ? {
                                            time: update.arrival.time
                                        } : null
                                    }))
                                }
                            });
                        }
                    }
                }
                
                // Clear the large GTFS data object
                gtfsData = null;
                
                console.log(`Preloaded ${service}: ${cleanEntities.length} entities`);
                return cleanEntities;
                
            } catch (error) {
                console.error(`Error preloading ${service}:`, error.message);
                return []; // Return empty array on error
            }
        });
        
        // Wait for all preload requests to complete
        const results = await Promise.all(promises);
        const allUpdates = results.reduce((acc, val) => acc.concat(val), []);
        
        // Cache the preloaded data
        setCachedData(allServicesKey, allUpdates);
        
        console.log(`GTFS cache preload complete! Cached ${allUpdates.length} total entities`);
        
    } catch (error) {
        console.error('Error during GTFS cache preload:', error);
        // Retry preload after 30 seconds if it fails
        setTimeout(() => {
            console.log('Retrying GTFS cache preload...');
            preloadGTFSCache();
        }, 30000);
    }
}

// Set up periodic cache refresh (every 45 seconds to ensure fresh data)
// Only set this up once, not inside the preload function
setTimeout(() => {
    // Clear any existing interval first
    if (cacheRefreshInterval) {
        clearInterval(cacheRefreshInterval);
    }
    
    // Set up the periodic refresh
    cacheRefreshInterval = setInterval(() => {
        console.log('Refreshing GTFS cache...');
        preloadGTFSCache();
    }, 45000); // 45 seconds
}, 5000); // Wait 5 seconds for initial setup
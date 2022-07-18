const GtfsRealtimeBindings = require('gtfs-realtime-bindings');
const request = require('request');
var feed = {};

const requestSettings = {
    method: 'GET',
    url: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
    headers: {
        "x-api-key": 'NaAY1FHNnu7I49kZeb681az1hn7YW4z68zwnnN8X'
    },
    encoding: null
}


request(requestSettings, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        let data = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
        for (entity of data.entity) {
            feed.push(entity);
        }
    }
});


// function parseBufferData(bufferData) {
//     let feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bufferData);
//     feed.entity.forEach((entity) => {
//         if (entity.trip_update) {
//             console.log(entity.trip_update);
//         }
//     });
// }
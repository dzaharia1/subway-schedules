require('dotenv').config();
const express = require('express');
const path = require('path');
const cons = require('consolidate');
const gtfs = require('./modules/gtfs');
const postgres = require('./modules/pg');
const cors = require('cors');

let app = express();

const localhost = 'http://localhost';
const localport = 3333;

app.use(cors());
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
  try {
    let signId = req.params.signId;
    let signInfo = await postgres.getSignConfig(signId);
    
    if (!signInfo || signInfo.length === 0) {
      return res.status(404).json({ error: `Sign ${signId} not found` });
    }
    
    signInfo = checkAutoSchedule(signInfo[0]);
    let stations = signInfo.stations;
    let directionFilter = signInfo.direction;
    let minimumTime = signInfo.minimum_time;
    
    gtfs.getStationSchedules(stations, minimumTime, [], [], (schedule) => {
      if (directionFilter && directionFilter != '') {
        schedule = schedule.filter(obj => obj.stopId.includes(directionFilter));
      }
      schedule = schedule.slice(0, signInfo.max_arrivals_to_show);
      schedule.unshift({
        rotating: signInfo.rotating,
        numArrivals: signInfo.max_arrivals_to_show,
        shutOffSchedule: signInfo.shutoff_schedule,
        turnOnTime: signInfo.turnon_time,
        shutOffTime: signInfo.turnoff_time,
        warnTime: signInfo.warn_time,
        signOn: signInfo.sign_on,
        rotationTime: signInfo.rotation_time
      });
      res.json(schedule);
    });
  } catch (error) {
    console.error('Error in /sign/:signId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/setstops/:signId', async (req, res) => {
  try {
    let signId = req.params.signId;
    let stops = req.query.stops.split(',');
    
    // Convert stops array to PostgreSQL array format
    let stopsString = `{${stops.map(stop => `"${stop.trim()}"`).join(',')}}`;

    let returnInfo = await postgres.setSignStops(signId, stopsString);
    res.json(returnInfo);
  } catch (error) {
    console.error('Error in /setstops/:signId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/signinfo/:signId', async (req, res) => {
  try {
    let signInfo = await postgres.getSignConfig(req.params.signId);
    
    if (signInfo.length === 0) {
      console.log(`Didn't find sign ${req.params.signId}`);
      res.json({
        error: `There is no sign with code ${req.params.signId}.`
      });
      
      return;
    } else {
      signInfo = checkAutoSchedule(signInfo[0]);
      res.json(signInfo);
    }
  } catch (error) {
    console.error('Error in /signinfo/:signId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/signstations/:signId', async (req, res) => {
  try {
    let signInfo = await postgres.getSignConfig(req.params.signId);
    if (signInfo.length === 0) {
      console.log(`Didn't find sign ${req.params.signId}`);
      res.json({
        error: `There is no sign with code ${req.params.signId}.`
      });

      return;
    }

    let returnData = gtfs.stations.filter((obj) => {
      for (let stopId of signInfo[0].stations) {
        if (obj.stopId === stopId) {
          return obj;
        }
      }
    });

    console.log(returnData);

    res.json(returnData);
  } catch (error) {
    console.error('Error in /signstations/:signId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/signinfo/:signId', async (req, res) => {
  try {
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

    let newConfig = {
        minTime: minTime,
        warnTime: warnTime,
        signDirection: signDirection.toUpperCase(),
        signRotation: signRotation,
        numArrivals: numArrivals,
        cycleTime: cycleTime,
        autoOff: autoOff,
        autoOffStart: autoOffStart,
        autoOffEnd: autoOffEnd
    };
    console.log(newConfig);

    res.json(await postgres.setSignConfig(signId, newConfig));
  } catch (error) {
    console.error('Error in POST /signinfo/:signId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/signpower/:signid', async (req, res) => {
  try {
    let signId = req.params.signid;
    let powerMode = req.query.power;
    res.json(await postgres.setSignPower(signId, powerMode));
  } catch (error) {
    console.error('Error in /signpower/:signid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/signpower/:signId', async (req, res) => {
  try {
    let signInfo = await postgres.getSignConfig(req.params.signId);
    console.log(signInfo);

    res.json(signInfo[0].sign_on);
  } catch (error) {
    console.error('Error in GET /signpower/:signId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/stations', (req, res) => {
  res.json(gtfs.stations);
});

app.get('/signids', async (req, res) => {
  try {
    res.json(await postgres.getSignIds());
  } catch (error) {
    console.error('Error in /signids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

var server = app.listen(app.get('port'), () => {
  app.address = app.get('host') + ':' + server.address().port;
  console.log('Listening at ' + app.address);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    postgres.close().then(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    postgres.close().then(() => {
      console.log('Database connections closed');
      process.exit(0);
    });
  });
});

function checkAutoSchedule(signInfo) {
  if (signInfo["shutoff_schedule"] && signInfo['sign_on']) {
    const autoOffTime = signInfo['turnoff_time'];
    const autoOnTime = signInfo['turnon_time'];
    const turnOnTime = parseInt(autoOnTime.substr(0, 2), 10) * 60 + parseInt(autoOnTime.substr(3, 2), 10);
    const turnOffTime = parseInt(autoOffTime.substr(0, 2), 10) * 60 + parseInt(autoOffTime.substr(3, 2), 10);

    const dateString = new Date().toLocaleString("en-us", { timeZone: 'America/New_York'});
    const currentTimeObject = new Date(dateString);
    const currentTime = currentTimeObject.getHours() * 60 + currentTimeObject.getMinutes();

    if (currentTime < turnOnTime || currentTime >= turnOffTime) {
      signInfo['sign_on'] = false;
    }
  }

  return signInfo;
}
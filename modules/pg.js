const SqlString = require('sqlstring');
const { pool, Client } = require('pg');

let client;

if (process.env.DATABASE_URL) {
    client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    client = new Client({
        connectionString: 'postgresql://dan@localhost:5432/subway-sign'
    });
}

client.connect();

async function runQuery(query) {
    let rows;

    try {
        rows = await client.query(query);
    } catch (error) {
        console.error('~~~~~~~~~~~~~~there was an error~~~~~~~~~~~~~~~~');
        console.error(error.stack);
    } finally {
        return rows.rows;
    }
}

module.exports = {
    getSignIds: async () => {
        return await runQuery(`
            SELECT sign_id FROM signs;
        `);
    },
    getSignConfig: async (signId) => {
        return await runQuery(`
            SELECT * FROM signs WHERE sign_id='${signId}';
        `);
    },
    setSignStops: async (signId, stops) => {
        return await runQuery(`
            UPDATE signs
            SET stations='{${stops}}'
            WHERE sign_id='${signId}'
            RETURNING stations;
        `);
    },
    setSignConfig: async (signId, signConfig) => {
        return await runQuery(`
            UPDATE signs
            SET minimum_time='${signConfig.minTime}', warn_time='${signConfig.warnTime}', direction='${signConfig.signDirection}', rotating='${signConfig.signRotation}', max_arrivals_to_show='${signConfig.numArrivals}', rotation_time='${signConfig.cycleTime}', shutoff_schedule='${signConfig.autoOff}', turnon_time='${signConfig.autoOffEnd}', turnoff_time='${signConfig.autoOffStart}'
            WHERE sign_id='${signId}'
            RETURNING *
        `);
    },
    setSignPower: async (signId, powerMode) => {
        return await runQuery(`
            UPDATE signs
            SET sign_on=${powerMode}
            WHERE sign_id='${signId}'
            RETURNING sign_on
        `);
    }
};
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
            SET direction='${signConfig.signDirection || NULL}', rotating='${signConfig.signRotation}', max_arrivals_to_show='${signConfig.numArrivals}', rotation_time='${signConfig.cycleTime}', shutoff_schedule='${signConfig.autoOff}'
            WHERE sign_id='${signId}'
            RETURNING *
        `);
    }
};
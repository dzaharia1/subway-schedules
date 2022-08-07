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
    getSignInfo: async (signId) => {
        return await runQuery(`
            SELECT * FROM signs WHERE sign_id='${signId}';
        `);
    },
    setSignStops: async (signId, stops, directions) => {
        console.log(`
            UPDATE signs
            SET stations='{${stops}}', directions='{${directions}}'
            WHERE sign_id='${signId}'
            RETURNING *;
        `);
        return await runQuery(`
            UPDATE signs
            SET stations='{${stops}}', directions='{${directions}}'
            WHERE sign_id='${signId}'
            RETURNING *;
        `);
    },
    setSignMinimumTime: async (signId, minTime) => {
        return await runQuery(`
            UPDATE signs
            SET minimum_time='${minTime}'
            WHERE sign_id='${signId}'
            RETURNING *;
        `);
    }
};
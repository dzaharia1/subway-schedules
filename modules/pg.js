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
        console.log(`SELECT stations FROM signs WHERE sign_id="${signId}";`);
        return await runQuery(`SELECT stations FROM signs WHERE sign_id="${signId}";`);
    }
};
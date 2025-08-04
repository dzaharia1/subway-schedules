const { Pool } = require('pg');

// Use connection pooling instead of a single client
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://dan@localhost:5432/subway-sign',
    ssl: process.env.DATABASE_URL ? {
        rejectUnauthorized: false
    } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Graceful shutdown
process.on('SIGINT', () => {
    pool.end();
    process.exit(0);
});

process.on('SIGTERM', () => {
    pool.end();
    process.exit(0);
});

async function runQuery(query, params = []) {
    const client = await pool.connect();
    
    try {
        const result = await client.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Database query error:', error.stack);
        throw error; // Re-throw to let calling code handle it
    } finally {
        client.release(); // Always release the client back to the pool
    }
}

module.exports = {
    getSignIds: async () => {
        return await runQuery('SELECT sign_id FROM signs');
    },
    
    getSignConfig: async (signId) => {
        return await runQuery('SELECT * FROM signs WHERE sign_id = $1', [signId]);
    },
    
    setSignStops: async (signId, stops) => {
        return await runQuery(
            'UPDATE signs SET stations = $1 WHERE sign_id = $2 RETURNING stations',
            [stops, signId]
        );
    },
    
    setSignConfig: async (signId, signConfig) => {
        return await runQuery(`
            UPDATE signs
            SET minimum_time = $1, 
                warn_time = $2, 
                direction = $3, 
                rotating = $4, 
                max_arrivals_to_show = $5, 
                rotation_time = $6, 
                shutoff_schedule = $7, 
                turnon_time = $8, 
                turnoff_time = $9
            WHERE sign_id = $10
            RETURNING *
        `, [
            signConfig.minTime,
            signConfig.warnTime,
            signConfig.signDirection,
            signConfig.signRotation,
            signConfig.numArrivals,
            signConfig.cycleTime,
            signConfig.autoOff,
            signConfig.autoOffEnd,
            signConfig.autoOffStart,
            signId
        ]);
    },
    
    setSignPower: async (signId, powerMode) => {
        return await runQuery(
            'UPDATE signs SET sign_on = $1 WHERE sign_id = $2 RETURNING sign_on',
            [powerMode, signId]
        );
    },
    
    // Add method to close the pool (useful for testing or graceful shutdown)
    close: async () => {
        await pool.end();
    }
};
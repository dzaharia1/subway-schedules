const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore('signs');

module.exports = {
  getSignIds: async () => {
    try {
      const snapshot = await db.collection('signs').select().get();
      return snapshot.docs.map(doc => ({ sign_id: doc.id }));
    } catch (error) {
      console.error('Firestore getSignIds error:', error);
      throw error;
    }
  },

  getSignConfig: async (signId) => {
    try {
      const doc = await db.collection('signs').doc(signId).get();
      if (!doc.exists) {
        return [];
      }
      return [{ sign_id: doc.id, ...doc.data() }];
    } catch (error) {
      console.error('Firestore getSignConfig error:', error);
      throw error;
    }
  },

  setSignStops: async (signId, stops) => {
    try {
      // Parse Postgres array string if passed (e.g., '{"901","631"}')
      let cleanStops = stops;
      if (typeof stops === 'string') {
        cleanStops = stops.replace(/[{}"\s]/g, '').split(',').map(s => s.trim());
      }
      
      await db.collection('signs').doc(signId).update({
        stations: cleanStops
      });
      return [{ stations: cleanStops }];
    } catch (error) {
      console.error('Firestore setSignStops error:', error);
      throw error;
    }
  },

  setSignConfig: async (signId, signConfig) => {
    try {
      const updateData = {
        minimum_time: parseInt(signConfig.minTime, 10) || 0,
        warn_time: parseInt(signConfig.warnTime, 10) || 1,
        direction: signConfig.signDirection || '',
        rotating: signConfig.signRotation === 'true' || signConfig.signRotation === true,
        max_arrivals_to_show: parseInt(signConfig.numArrivals, 10) || 6,
        rotation_time: parseInt(signConfig.cycleTime, 10) || 6,
        shutoff_schedule: signConfig.autoOff === 'true' || signConfig.autoOff === true,
        turnon_time: signConfig.autoOffEnd || '07:00:00',  // Postgres $8 mapped to autoOffEnd
        turnoff_time: signConfig.autoOffStart || '22:30:00' // Postgres $9 mapped to autoOffStart
      };

      const docRef = db.collection('signs').doc(signId);
      await docRef.update(updateData);
      
      const updatedDoc = await docRef.get();
      return [{ sign_id: updatedDoc.id, ...updatedDoc.data() }];
    } catch (error) {
      console.error('Firestore setSignConfig error:', error);
      throw error;
    }
  },

  setSignPower: async (signId, powerMode) => {
    try {
      const isPowerOn = powerMode === 'true' || powerMode === true;
      await db.collection('signs').doc(signId).update({
        sign_on: isPowerOn
      });
      return [{ sign_on: isPowerOn }];
    } catch (error) {
      console.error('Firestore setSignPower error:', error);
      throw error;
    }
  },

  close: async () => {
    // No-op for Firestore
    return Promise.resolve();
  }
};

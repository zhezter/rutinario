// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_harsh_vin_gonzales.sql';
import m0001 from './0001_nifty_silver_fox.sql';
import m0002 from './0002_public_pestilence.sql';
import m0003 from './0003_dazzling_nova.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002,
m0003
    }
  }
  
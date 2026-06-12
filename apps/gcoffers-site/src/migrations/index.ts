import * as migration_20260606_154941_initial_schema from './20260606_154941_initial_schema';
import * as migration_20260612_120000_deal_buyer_fields from './20260612_120000_deal_buyer_fields';
import * as migration_20260612_151525_staff_access_and_default_markets from './20260612_151525_staff_access_and_default_markets';

export const migrations = [
  {
    up: migration_20260606_154941_initial_schema.up,
    down: migration_20260606_154941_initial_schema.down,
    name: '20260606_154941_initial_schema'
  },
  {
    up: migration_20260612_120000_deal_buyer_fields.up,
    down: migration_20260612_120000_deal_buyer_fields.down,
    name: '20260612_120000_deal_buyer_fields'
  },
  {
    up: migration_20260612_151525_staff_access_and_default_markets.up,
    down: migration_20260612_151525_staff_access_and_default_markets.down,
    name: '20260612_151525_staff_access_and_default_markets'
  },
];

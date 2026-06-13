import * as migration_20260606_154941_initial_schema from './20260606_154941_initial_schema';
import * as migration_20260612_120000_deal_buyer_fields from './20260612_120000_deal_buyer_fields';
import * as migration_20260612_151525_staff_access_and_default_markets from './20260612_151525_staff_access_and_default_markets';
import * as migration_20260612_171059_deal_public_surface_regressions from './20260612_171059_deal_public_surface_regressions';
import * as migration_20260613_074900_deal_map_and_comp_fields from './20260613_074900_deal_map_and_comp_fields';
import * as migration_20260613_151940_fix_deal_comp_array_columns from './20260613_151940_fix_deal_comp_array_columns';

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
  {
    up: migration_20260612_171059_deal_public_surface_regressions.up,
    down: migration_20260612_171059_deal_public_surface_regressions.down,
    name: '20260612_171059_deal_public_surface_regressions'
  },
  {
    up: migration_20260613_074900_deal_map_and_comp_fields.up,
    down: migration_20260613_074900_deal_map_and_comp_fields.down,
    name: '20260613_074900_deal_map_and_comp_fields'
  },
  {
    up: migration_20260613_151940_fix_deal_comp_array_columns.up,
    down: migration_20260613_151940_fix_deal_comp_array_columns.down,
    name: '20260613_151940_fix_deal_comp_array_columns'
  },
];

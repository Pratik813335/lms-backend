import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.join(__dirname, '../.env')});

import {LmsBackendApplication} from './application';

export async function migrate(args: string[]) {
  const existingSchema = args.includes('--rebuild') ? 'drop' : 'alter';
  console.log('Migrating schemas (%s existing schema)...', existingSchema);

  const app = new LmsBackendApplication();
  await app.boot();
  await app.migrateSchema({
    existingSchema,
    models: [
      'Users',
      'Roles',
      'Permissions',
      'RolePermissions',
      'UserRoles',
      'StudentProfile',
      'GradeLevels',
      'Subjects',
      'Tiers',
      'AssetTypes',
      'ComplianceStatuses',
    ],
  });

  console.log('✅ Database schema migration completed successfully.');
  process.exit(0);
}

migrate(process.argv).catch(err => {
  console.error('Cannot migrate database schema', err);
  process.exit(1);
});

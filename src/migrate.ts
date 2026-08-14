import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({path: path.join(__dirname, '../.env')});

import {LmsBackendApplication} from './application';
import {RolesRepository} from './repositories';

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
      'Otp',
    ],
  });

  // Seed default system roles into PostgreSQL roles table
  const rolesRepo = await app.getRepository(RolesRepository);
  const defaultRoles = [
    {value: 'student_junior', label: 'Junior Student', description: 'Gamified junior student access'},
    {value: 'student_senior', label: 'Senior Student', description: 'Advanced high school senior student access'},
    {value: 'admin', label: 'System Administrator', description: 'Full system administration privileges'},
    {value: 'academic', label: 'Academic Coordinator', description: 'Academic performance and compliance monitoring'},
    {value: 'content', label: 'Content Creator / Curriculum Author', description: 'Course and curriculum authoring access'},
    {value: 'operations', label: 'Operations & Billing Staff', description: 'Operations and financial management access'},
  ];

  for (const roleDef of defaultRoles) {
    const existing = await rolesRepo.findOne({where: {value: roleDef.value}});
    if (!existing) {
      await rolesRepo.create({
        ...roleDef,
        isActive: true,
        isDeleted: false,
      });
    }
  }

  console.log('✅ Database schema migration and default role seeding completed successfully.');
  process.exit(0);
}

migrate(process.argv).catch(err => {
  console.error('Cannot migrate database schema', err);
  process.exit(1);
});

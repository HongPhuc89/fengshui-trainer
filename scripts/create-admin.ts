import { config as dotenvConfig } from 'dotenv';
dotenvConfig();
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';
import { UserRole } from '../src/shares/enums/user-role.enum';

async function createAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const fullName = process.argv[4] || 'Admin User';

  if (!email || !password) {
    console.error('Usage: npm run create:admin <email> <password> [full_name]');
    console.error('Example: npm run create:admin admin@example.com password123 "Admin User"');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Error: Password must be at least 6 characters long');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Check if user already exists
    const existingUser = await usersService.findByEmail(email);
    if (existingUser) {
      console.error(`Error: User with email ${email} already exists`);
      process.exit(1);
    }

    // Create admin user
    const adminUser = await usersService.addNewUser(
      {
        email,
        password,
        full_name: fullName,
        role: UserRole.ADMIN,
      },
      undefined,
    );

    console.log('✅ Admin user created successfully!');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Full Name: ${adminUser.full_name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Active: ${adminUser.is_active}`);

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error('   Unknown error occurred');
    }
    await app.close();
    process.exit(1);
  }
}

createAdmin();

import { Module } from '@nestjs/common';
import { AdminModule as AdminJSModule } from '@adminjs/nestjs';
import { Database, Resource } from '@adminjs/typeorm';
import AdminJS from 'adminjs';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { Book } from '../books/entities/book.entity';
import { Chapter } from '../books/entities/chapter.entity';
import { UploadedFile } from '../upload/entities/uploaded-file.entity';
import { isHashEqual } from '../../shares/helpers/cryptography';
import { UserRole } from '../../shares/enums/user-role.enum';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    UsersModule,
    AdminJSModule.createAdminAsync({
      imports: [UsersModule],
      inject: [UsersService],
      useFactory: async (usersService: UsersService) => ({
        adminJsOptions: {
          rootPath: '/admin',
          resources: [{ resource: User }, { resource: Book }, { resource: Chapter }, { resource: UploadedFile }],
        },
        auth: {
          authenticate: async (email, password) => {
            const user = await usersService.findByEmail(email);
            if (
              user &&
              user.credential &&
              (await isHashEqual(password, user.credential.password)) &&
              (user.role === UserRole.ADMIN || user.role === UserRole.STAFF)
            ) {
              return {
                id: user.id.toString(),
                email: user.email,
                title: user.full_name,
                role: user.role,
              };
            }
            return null;
          },
          cookieName: 'adminjs',
          cookiePassword: 'some-secret-password-must-be-long-and-secure',
        },
        sessionOptions: {
          resave: true,
          saveUninitialized: true,
          secret: 'some-secret-password-must-be-long-and-secure',
        },
      }),
    }),
  ],
})
export class AdminModule {}

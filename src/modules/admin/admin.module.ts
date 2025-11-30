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
import { UploadModule } from '../upload/upload.module';
import { UploadService } from '../upload/upload.service';
import { FileType } from '../../shares/enums/file-type.enum';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    UsersModule,
    UploadModule,
    AdminJSModule.createAdminAsync({
      imports: [UsersModule, UploadModule],
      inject: [UsersService, UploadService],
      useFactory: async (usersService: UsersService, uploadService: UploadService) => ({
        adminJsOptions: {
          rootPath: '/admin',
          resources: [
            { resource: User },
            {
              resource: Book,
              options: {
                properties: {
                  cover_file_id: { isVisible: false },
                  file_id: { isVisible: false },
                  user_id: { isVisible: false },
                  chapter_count: { isVisible: false },
                  status: { isVisible: { list: true, show: true, edit: true, filter: true } },
                  cover_image: {
                    type: 'file',
                    isVisible: { list: false, show: true, edit: true, filter: false },
                  },
                  book_file: {
                    type: 'file',
                    isVisible: { list: false, show: true, edit: true, filter: false },
                  },
                },
                actions: {
                  new: {
                    handler: async (request, response, context) => {
                      const { resource, h, currentAdmin } = context;
                      if (request.method === 'post') {
                        const { payload } = request;
                        const coverImage = payload.cover_image;
                        const bookFile = payload.book_file;

                        try {
                          let coverFileId = null;
                          let bookFileId = null;

                          // We need to fetch the user entity for the current admin
                          const user = await usersService.findByEmail(currentAdmin.email);

                          if (coverImage) {
                            const uploadedCover = await uploadService.uploadFile(coverImage, FileType.COVER, user);
                            coverFileId = uploadedCover.id;
                          }

                          if (bookFile) {
                            const uploadedBook = await uploadService.uploadFile(bookFile, FileType.BOOK, user);
                            bookFileId = uploadedBook.id;
                          }

                          const book = await resource.create({
                            ...payload,
                            cover_file_id: coverFileId,
                            file_id: bookFileId,
                            user_id: user.id,
                          });

                          return {
                            record: book.toJSON(currentAdmin),
                            redirectUrl: h.resourceUrl({ resourceId: resource._decorated?.id() || resource.id() }),
                            notice: {
                              message: 'Book successfully created',
                              type: 'success',
                            },
                          };
                        } catch (error) {
                          return {
                            record: null,
                            notice: {
                              message: `Error creating book: ${error.message}`,
                              type: 'error',
                            },
                          };
                        }
                      }
                      return {};
                    },
                  },
                },
              },
            },
            { resource: Chapter },
            { resource: UploadedFile },
          ],
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

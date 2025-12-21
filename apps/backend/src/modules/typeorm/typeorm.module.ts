import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '../core/config.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.getDatabaseConfiguration();
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          entities: [__dirname + '/../../modules/**/entities/*.entity{.ts,.js}'],
          synchronize: false,
          logging: true,
          timezone: 'Z',
          ssl: {
            rejectUnauthorized: false,
          },
          extra: {
            // Force IPv4 DNS resolution
            options: '-c client_encoding=UTF8',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class TypeormModule {}

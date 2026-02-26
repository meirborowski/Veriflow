import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { UserStoriesModule } from './user-stories/user-stories.module';
import { ReleasesModule } from './releases/releases.module';
import { TestExecutionModule } from './test-execution/test-execution.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    AuthModule,
    ProjectsModule,
    UserStoriesModule,
    ReleasesModule,
    TestExecutionModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

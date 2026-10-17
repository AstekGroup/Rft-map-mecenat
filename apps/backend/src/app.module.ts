import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventsModule } from './events/events.module';
import { AppConfigModule } from './config/config.module';
import { BaserowModule } from './baserow/baserow.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AppConfigModule,
    BaserowModule,
    EventsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

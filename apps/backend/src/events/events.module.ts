import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { BaserowModule } from '../baserow/baserow.module';

@Module({
  imports: [BaserowModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}

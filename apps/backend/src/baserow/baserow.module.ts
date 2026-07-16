import { Module } from '@nestjs/common';
import { BaserowService } from './baserow.service';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [GeocodingModule],
  providers: [BaserowService],
  exports: [BaserowService],
})
export class BaserowModule {}

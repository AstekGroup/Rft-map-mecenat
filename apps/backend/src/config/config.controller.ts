import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from './config.service';

@Controller('api/config')
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  getConfig() {
    return this.appConfig.get();
  }
}

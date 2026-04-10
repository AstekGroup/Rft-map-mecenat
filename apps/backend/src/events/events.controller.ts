import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventsService } from './events.service';
import type { Event, Partner } from '@make-map/types';

@Controller('api/events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  /**
   * GET /api/events
   * Retourne tous les événements.
   * Query: ?devMode=true pour inclure les événements non modérés.
   */
  @Get()
  async findAll(@Query('devMode') devMode?: string): Promise<Event[]> {
    const isDevMode = devMode === 'true';
    this.logger.log(`GET /api/events (devMode: ${isDevMode})`);
    return this.eventsService.findAll(isDevMode);
  }

  /**
   * GET /api/events/partners
   * Retourne tous les partenaires.
   */
  @Get('partners')
  async findAllPartners(): Promise<Partner[]> {
    this.logger.log('GET /api/events/partners');
    return this.eventsService.findAllPartners();
  }

  /**
   * GET /api/events/:id
   * Retourne un événement par son ID.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('devMode') devMode?: string,
  ): Promise<Event> {
    const isDevMode = devMode === 'true';
    this.logger.log(`GET /api/events/${id}`);
    const event = await this.eventsService.findOne(id, isDevMode);
    if (!event) {
      throw new NotFoundException(`Événement ${id} non trouvé`);
    }
    return event;
  }
}

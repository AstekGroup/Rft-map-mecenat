import {
  BadGatewayException,
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventsService } from './events.service';
import { ReferenceTableError } from '../baserow/baserow.errors';
import type { Event, LinkedTableRow } from '@make-map/types';

@Controller('api/events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Le contournement de la modération (?devMode=true) n'est honoré que si
   * ALLOW_DEV_MODE=true ET hors production. Sinon le paramètre est ignoré :
   * la réponse reste filtrée (événements acceptés uniquement).
   */
  private resolveDevMode(requested?: string): boolean {
    if (requested !== 'true') return false;

    const allowed =
      this.configService.get<string>('ALLOW_DEV_MODE') === 'true' &&
      this.configService.get<string>('NODE_ENV') !== 'production';

    if (!allowed) {
      this.logger.warn(
        '?devMode=true ignoré (ALLOW_DEV_MODE non activé ou environnement de production)',
      );
    }
    return allowed;
  }

  /**
   * Une table de référence illisible répond 502 (service amont en erreur) au lieu d'une liste
   * vide : le client doit pouvoir distinguer « cette carte n'a pas de partenaires » de
   * « les partenaires n'ont pas pu être chargés ». Le détail est dans les logs, pas dans la réponse.
   */
  private async reference(
    load: () => Promise<LinkedTableRow[]>,
  ): Promise<LinkedTableRow[]> {
    try {
      return await load();
    } catch (error) {
      if (error instanceof ReferenceTableError) {
        throw new BadGatewayException(
          `Référentiel indisponible (${error.table}) : réessayer plus tard.`,
        );
      }
      throw error;
    }
  }

  /**
   * GET /api/events
   * Retourne tous les événements acceptés par la modération.
   * Query: ?devMode=true inclut les événements non modérés, uniquement si
   * ALLOW_DEV_MODE=true hors production (ignoré sinon).
   */
  @Get()
  async findAll(@Query('devMode') devMode?: string): Promise<Event[]> {
    const isDevMode = this.resolveDevMode(devMode);
    this.logger.log(`GET /api/events (devMode: ${isDevMode})`);
    return this.eventsService.findAll(isDevMode);
  }

  /**
   * GET /api/events/partners
   * Retourne tous les partenaires.
   */
  @Get('partners')
  async findAllPartners(): Promise<LinkedTableRow[]> {
    this.logger.log('GET /api/events/partners');
    return this.reference(() => this.eventsService.findAllPartners());
  }

  /**
   * GET /api/events/themes
   * Retourne toutes les thématiques.
   */
  @Get('themes')
  async findAllThemes(): Promise<LinkedTableRow[]> {
    this.logger.log('GET /api/events/themes');
    return this.reference(() => this.eventsService.findAllThemes());
  }

  /**
   * GET /api/events/formats
   * Retourne tous les formats.
   */
  @Get('formats')
  async findAllFormats(): Promise<LinkedTableRow[]> {
    this.logger.log('GET /api/events/formats');
    return this.reference(() => this.eventsService.findAllFormats());
  }

  /**
   * GET /api/events/publics
   * Retourne l'audience (public cible).
   */
  @Get('publics')
  async findAllPublics(): Promise<LinkedTableRow[]> {
    this.logger.log('GET /api/events/publics');
    return this.reference(() => this.eventsService.findAllPublics());
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
    const isDevMode = this.resolveDevMode(devMode);
    this.logger.log(`GET /api/events/${id}`);
    const event = await this.eventsService.findOne(id, isDevMode);
    if (!event) {
      throw new NotFoundException(`Événement ${id} non trouvé`);
    }
    return event;
  }
}

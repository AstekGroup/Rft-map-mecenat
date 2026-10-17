import { Controller, Get } from '@nestjs/common';
import { BaserowService } from './baserow/baserow.service';

@Controller()
export class AppController {
  constructor(private readonly baserowService: BaserowService) {}

  /**
   * Santé du service. Toujours HTTP 200 (la sonde Docker ne doit pas redémarrer le conteneur
   * pour un Baserow momentanément en erreur) ; `status` vaut `degraded` quand la dernière
   * lecture d'une table de référence a échoué. Les détails techniques restent dans les logs.
   */
  @Get('api/health')
  healthCheck() {
    const references = this.baserowService.getReferenceStatus();
    return {
      status: references.some((reference) => !reference.ok) ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      service: 'make-map-backend',
      references: references.map(({ table, ok, checkedAt }) => ({
        table,
        status: ok ? 'ok' : 'error',
        checkedAt,
      })),
    };
  }
}

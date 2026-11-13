import { AppController } from './app.controller';
import type { BaserowService } from './baserow/baserow.service';
import type { ReferenceTableStatus } from './baserow/baserow.errors';

function buildController(statuses: ReferenceTableStatus[]) {
  const baserowService = {
    getReferenceStatus: () => statuses,
  } as unknown as BaserowService;
  return new AppController(baserowService);
}

const checkedAt = '2026-05-20T10:00:00.000Z';

describe('AppController /api/health', () => {
  it('répond ok tant qu’aucune table de référence n’a échoué', () => {
    const result = buildController([
      { table: 'BASEROW_FORMATS_TABLE', ok: true, checkedAt },
    ]).healthCheck();

    expect(result.status).toBe('ok');
    expect(result.references).toEqual([
      { table: 'BASEROW_FORMATS_TABLE', status: 'ok', checkedAt },
    ]);
  });

  it('répond ok avant tout chargement (aucun état connu)', () => {
    expect(buildController([]).healthCheck().status).toBe('ok');
  });

  it('répond degraded quand une table de référence est en erreur', () => {
    const result = buildController([
      { table: 'BASEROW_FORMATS_TABLE', ok: true, checkedAt },
      { table: 'BASEROW_PARTNERS_TABLE', ok: false, checkedAt },
    ]).healthCheck();

    expect(result.status).toBe('degraded');
    expect(result.references).toContainEqual({
      table: 'BASEROW_PARTNERS_TABLE',
      status: 'error',
      checkedAt,
    });
  });
});

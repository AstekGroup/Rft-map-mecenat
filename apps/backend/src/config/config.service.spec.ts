import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './config.service';

describe('AppConfigService : gabarits', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'app-config-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function load(config: unknown): AppConfigService {
    const path = join(dir, 'app.config.json');
    writeFileSync(path, JSON.stringify(config), 'utf-8');
    const env = { get: (key: string) => (key === 'APP_CONFIG_PATH' ? path : undefined) };
    const service = new AppConfigService(env as unknown as ConfigService);
    service.onModuleInit();
    return service;
  }

  it('sert une config dont les gabarits sont résolus', () => {
    const service = load({
      profile: 'test',
      app: { name: 'Les Journées du Test' },
      texts: { home: { mainTitle: '{{app.name}}' } },
    });
    expect(service.safe.texts.home.mainTitle).toBe('Les Journées du Test');
  });
});

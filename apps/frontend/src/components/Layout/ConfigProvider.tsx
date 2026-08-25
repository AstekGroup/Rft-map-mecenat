import { useEffect, useState, useMemo, type ReactNode } from 'react';
import type { AppConfig } from '@/types/event';
import { fetchConfig } from '@/services/api';
import { ConfigContext, buildHelpers } from '@/hooks/useConfig';

interface ConfigProviderProps {
  children: ReactNode;
}

export function ConfigProvider({ children }: ConfigProviderProps) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const helpers = useMemo(() => buildHelpers(config), [config]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await fetchConfig();
        if (cancelled) return;
        setConfig(data);
        injectCSSVariables(data.theme);
        injectFonts(data.theme.fonts);
      } catch (err) {
        if (cancelled) return;
        console.warn('[ConfigProvider] Impossible de charger la config, utilisation des valeurs par défaut');
        setError(err instanceof Error ? err : new Error('Erreur de chargement de la config'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error, helpers }}>
      {children}
    </ConfigContext.Provider>
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function injectCSSVariables(theme: AppConfig['theme']) {
  const root = document.documentElement;

  if (theme.colors) {
    for (const [key, value] of Object.entries(theme.colors)) {
      if (value.startsWith('#')) {
        root.style.setProperty(`--color-${key}-rgb`, hexToRgb(value));
      }
    }
  }

if (theme.fonts) {
  root.style.setProperty('--font-heading', theme.fonts.heading);
  root.style.setProperty('--font-body', theme.fonts.body);
}

  if (theme.borderRadius) {
    for (const [key, value] of Object.entries(theme.borderRadius)) {
      root.style.setProperty(`--radius-${key}`, value);
    }
  }
}

function injectFonts(fonts: AppConfig['theme']['fonts']) {
  if (!fonts.googleFontsUrl) return;

  const existing = document.querySelector('link[data-config-fonts]');
  if (existing) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fonts.googleFontsUrl;
  link.setAttribute('data-config-fonts', '');
  document.head.appendChild(link);
}

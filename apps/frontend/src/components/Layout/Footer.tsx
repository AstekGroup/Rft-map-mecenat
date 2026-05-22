import { Mail, Heart, Globe } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-primary text-white py-3 px-4 z-20">
      <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Liens */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="text-sm hover:text-accent-yellow transition-colors"
          >
            semaine-vegetale.fr
          </a>
          <span className="text-white/30">|</span>
          <a
            href="#"
            className="flex items-center gap-1.5 text-sm hover:text-accent-yellow transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Réseaux Sociaux</span>
          </a>
          <a
            href="mailto:contact@semaine-vegetale.fr"
            className="flex items-center gap-1.5 text-sm hover:text-accent-yellow transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Contact</span>
          </a>
        </div>

        {/* Copyright */}
        <div className="flex items-center gap-1.5 text-sm text-white/70">
          <span>Fait avec</span>
          <Heart className="w-3.5 h-3.5 text-accent-red fill-accent-red" />
          <span>pour une alimentation durable</span>
          <span className="text-white/50">• 2026</span>
        </div>
      </div>
    </footer>
  );
}

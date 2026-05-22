import { ExternalLink, Mail } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-primary text-white py-3 px-4 shadow-lg z-20">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        {/* Logo et titre */}
        <div className="flex items-center gap-4">
          <a
            href="#"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="flex flex-col">
              <span className="font-poppins font-bold text-lg sm:text-xl leading-none">
                LA GRANDE
              </span>
              <span className="font-poppins font-bold text-accent-yellow text-xl sm:text-2xl leading-none">
                SEMAINE
              </span>
              <span className="font-poppins font-bold text-sm sm:text-base leading-none">
                VÉGÉTALE
              </span>
            </div>
          </a>
          
          <div className="hidden sm:block h-10 w-px bg-white/20" />
          
          <div className="hidden sm:block">
            <span className="text-sm text-white/80">Carte interactive</span>
            <p className="font-semibold text-lg leading-tight">Événements nationaux</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="mailto:contact@semaine-vegetale.fr"
            className="p-2 sm:px-4 sm:py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
            title="Contactez-nous"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">Contact</span>
          </a>
          <a
            href="#"
            className="px-3 sm:px-4 py-2 rounded-button bg-accent-yellow hover:bg-yellow-500 transition-colors flex items-center gap-2 text-sm font-semibold text-text-primary"
          >
            <span className="hidden sm:inline">Découvrir le projet</span>
            <span className="sm:hidden">Projet</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

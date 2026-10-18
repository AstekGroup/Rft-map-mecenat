/**
 * État d'erreur affiché quand `/api/config` n'a pas pu être chargée : sans config, les titres,
 * les dates et le thème de la carte sont inconnus. Il ne dépend d'aucune donnée de la config
 * (le thème n'est pas injecté) : il reste lisible avec la palette neutre de `globals.css`.
 */
export function ConfigErrorState() {
  return (
    <div className="min-h-screen w-full bg-surface-offwhite text-text-primary flex items-center justify-center font-body">
      <div className="text-center max-w-md p-8" role="alert">
        <h1 className="font-semibold text-xl mb-2">
          La carte est momentanément indisponible
        </h1>
        <p className="mb-6">
          La configuration de la carte n'a pas pu être chargée. Réessayez dans quelques instants.
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Réessayer
        </button>
      </div>
    </div>
  );
}

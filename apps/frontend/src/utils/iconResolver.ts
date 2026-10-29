import * as Icons from "lucide-react";
import {LucideIcon} from "lucide-react";


/** Couleur de repli d'un format dont la couleur Baserow est absente ou invalide. */
export const DEFAULT_FORMAT_COLOR = "#D4DDE2";

function isValidHexadecimalColor(color: string): boolean {
    return !!color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}


export function getIcon(name: string | null | undefined, defaultIcon: LucideIcon): LucideIcon {
  if (!name) return defaultIcon;

  // Convert kebab-case or snake-case to PascalCase
  const pascalName = name
    .trim()
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  const Icon = Icons[pascalName as keyof typeof Icons] || Icons[name as keyof typeof Icons];

  // On vérifie que l'export est bien un composant React
  if (!Icon || (typeof Icon !== "object" && typeof Icon !== "function")) {
    console.warn(`"${name}" is not a valid icon`);
    return defaultIcon;
  }
  return Icon as LucideIcon;
}

export function checkIconColor(color: string | null | undefined, defaultColor: string): string {
    if (!!color && isValidHexadecimalColor(color)) {
        return color;
    } else if (isValidHexadecimalColor(defaultColor)) {
        return defaultColor;
    } else {
        return "#C9C3C1";
    }
}
import * as Icons from "lucide-react";
import {LucideIcon} from "lucide-react";


/** Couleur de repli d'un format dont la couleur Baserow est absente ou invalide. */
export const DEFAULT_FORMAT_COLOR = "#D4DDE2";

function isValidHexadecimalColor(color: string): boolean {
    return !!color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}


/**
 * `pen-tool` (nom affiché par lucide.dev) → `PenTool` (export de `lucide-react`) ;
 * `arrow-down-0-1` → `ArrowDown01`.
 */
function kebabToPascalCase(name: string): string {
    return name
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join("");
}

/**
 * Icône `lucide-react` d'un nom de picto (colonne `Picto` des référentiels Baserow).
 * Accepte le nom exact (`PenTool`) puis la forme kebab-case de lucide.dev (`pen-tool`) ;
 * espaces en début et fin ignorés. Nom vide ou inconnu : `defaultIcon`.
 */
export function getIcon(name: string | null | undefined, defaultIcon: LucideIcon): LucideIcon {

    const trimmed = name?.trim();
    if (!trimmed) {
        return defaultIcon;
    }

    const exportName = [trimmed, kebabToPascalCase(trimmed)].find((candidate) => candidate in Icons);
    if (!exportName) {
        return defaultIcon;
    }

    const Icon = Icons[exportName as keyof typeof Icons];

    // On vérifie que l'export est bien un composant React
    if (typeof Icon !== "object" && typeof Icon !== "function") {
        console.warn(`"${exportName}" is not a valid icon`);
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
        return DEFAULT_FORMAT_COLOR;
    }
}
import * as Icons from "lucide-react";
import {LucideIcon} from "lucide-react";


function isValidHexadecimalColor(color: string): boolean {
    return !!color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color);
}


export function getIcon(name: string | null | undefined, defaultIcon: LucideIcon): LucideIcon {

    if(!name || !(name in Icons)){
        return defaultIcon;
    }

    const Icon = Icons[name as keyof typeof Icons];

    // On vérifie que l'export est bien un composant React
    if (typeof Icon !== "object" && typeof Icon !== "function") {
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
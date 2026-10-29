import { describe, it, expect } from 'vitest';
import { ChefHat, Globe, HelpCircle } from 'lucide-react';
import { getIcon, checkIconColor, DEFAULT_FORMAT_COLOR } from './iconResolver';

describe('iconResolver', () => {
  describe('getIcon', () => {
    it('renvoie l\'icône par défaut si la valeur est null, undefined ou vide', () => {
      expect(getIcon(null, HelpCircle)).toBe(HelpCircle);
      expect(getIcon(undefined, HelpCircle)).toBe(HelpCircle);
      expect(getIcon('', HelpCircle)).toBe(HelpCircle);
    });

    it('résout une icône en PascalCase (ex: ChefHat)', () => {
      expect(getIcon('ChefHat', HelpCircle)).toBe(ChefHat);
    });

    it('résout une icône en kebab-case (ex: chef-hat)', () => {
      expect(getIcon('chef-hat', HelpCircle)).toBe(ChefHat);
    });

    it('résout une icône en minuscules ou mélange (ex: globe)', () => {
      expect(getIcon('globe', HelpCircle)).toBe(Globe);
    });

    it('renvoie l\'icône par défaut si le nom n\'existe pas dans lucide-react', () => {
      expect(getIcon('icone-inexistante', HelpCircle)).toBe(HelpCircle);
    });
  });

  describe('checkIconColor', () => {
    it('valide et renvoie une couleur hexadécimale correcte', () => {
      expect(checkIconColor('#AE3B5D', '#D4DDE2')).toBe('#AE3B5D');
      expect(checkIconColor('#fff', '#D4DDE2')).toBe('#fff');
    });

    it('renvoie la couleur par défaut si la couleur est invalide', () => {
      expect(checkIconColor('invalid-color', '#D4DDE2')).toBe('#D4DDE2');
      expect(checkIconColor(null, '#D4DDE2')).toBe('#D4DDE2');
      expect(checkIconColor(undefined, '#D4DDE2')).toBe('#D4DDE2');
    });

    it('renvoie la constante de repli si la couleur par défaut est aussi invalide', () => {
      expect(checkIconColor(null, 'invalid')).toBe('#C9C3C1');
    });
  });
});

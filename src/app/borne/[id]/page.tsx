import fs from 'fs';
import path from 'path';
import KioskSimulator from '../../../components/KioskSimulator';
import { parseETK360Hierarchy } from '../../../lib/softaveraParser';

export default async function BornePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fileName = id.endsWith('.json') ? id : `${id}.json`;
  const filePath = path.join(process.cwd(), '.softavera', 'carte', fileName);

  if (!fs.existsSync(filePath)) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <h1>❌ Impossible de charger la borne. Le fichier {fileName} n'existe pas.</h1>
      </div>
    );
  }

  let data;
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(fileContent);
  } catch (e) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <h1>❌ Le fichier {fileName} est corrompu ou illisible.</h1>
      </div>
    );
  }

  // Lancement du nouveau Parseur IA qui respecte l'ordre absolu du JSON
  const tree = parseETK360Hierarchy(data);

  if (!tree || tree.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', flexDirection: 'column' }}>
        <h1 style={{ color: '#991b1b' }}>⚠️ Ce Catalogue ETK360 est invalide.</h1>
        <p>Le parseur n'a trouvé aucune catégorie ni workflow fonctionnel.</p>
      </div>
    );
  }

  const rawTitle = fileName
    .replace('.json', '')
    .replace('carte_', '')
    .replace('ia_', '')
    .replace(/_[0-9]+$/, '')
    .replace(/^[0-9_]+/, '')
    .replace(/_/g, ' ')
    .trim();
  const restaurantName = rawTitle 
    ? rawTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : "Borne Interactive";

  let themePalette = { primary: '#F39C12', secondary: '#1A237E', background: '#F8FAFC', surface: '#FFFFFF', text: '#111827', onPrimary: 'white' };
  
  if (data.theme && Array.isArray(data.theme.palette) && data.theme.palette.length >= 2) {
     const p = data.theme.palette;
     themePalette = {
        background: p[0] || themePalette.background,
        surface: p[1] || themePalette.surface,
        primary: p[2] || themePalette.primary,
        text: p[3] || themePalette.text,
        onPrimary: p[4] || themePalette.onPrimary,
        secondary: p[2] || themePalette.secondary 
     };
  } else if (data.theme && typeof data.theme === 'object' && !Array.isArray(data.theme.palette)) {
     themePalette = {
        primary: data.theme.primary || themePalette.primary,
        secondary: data.theme.secondary || themePalette.secondary,
        background: data.theme.background || themePalette.background,
        surface: themePalette.surface,
        text: data.theme.text || data.theme.primary || themePalette.text,
        onPrimary: 'white'
     };
  } else if (data.items) {
    const colorCounts: Record<string, number> = {};
    Object.values(data.items).forEach((item: any) => {
       if (item.color && typeof item.color === 'string' && item.color.startsWith('#')) {
          const color = item.color.trim().toUpperCase();
          colorCounts[color] = (colorCounts[color] || 0) + 1;
       }
    });

// Helper de conversion de couleur
    const hexToHsl = (hex: string) => {
      let r = 0, g = 0, b = 0;
      hex = hex.replace('#', '');
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h, s, l];
    };

    const hslToHex = (h: number, s: number, l: number) => {
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }
      const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const getLuminance = (hex: string) => {
      const c = hex.replace('#', '');
      if (c.length !== 6 && c.length !== 3) return 255;
      const r = c.length === 3 ? parseInt(c[0]+c[0], 16) : parseInt(c.substring(0, 2), 16) || 0;
      const g = c.length === 3 ? parseInt(c[1]+c[1], 16) : parseInt(c.substring(2, 4), 16) || 0;
      const b = c.length === 3 ? parseInt(c[2]+c[2], 16) : parseInt(c.substring(4, 6), 16) || 0;
      return (0.299 * r + 0.587 * g + 0.114 * b);
    };

    const isBadColor = (hex: string) => {
      const c = hex.replace('#', '');
      if (c.length !== 6 && c.length !== 3) return true;
      const r = c.length === 3 ? parseInt(c[0]+c[0], 16) : parseInt(c.substring(0, 2), 16) || 0;
      const g = c.length === 3 ? parseInt(c[1]+c[1], 16) : parseInt(c.substring(2, 4), 16) || 0;
      const b = c.length === 3 ? parseInt(c[2]+c[2], 16) : parseInt(c.substring(4, 6), 16) || 0;
      
      if (getLuminance(hex) > 175) return true; 
      if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20) return true; 
      return false;
    };

    const sortedVibrantColors = Object.keys(colorCounts)
       .filter(c => !isBadColor(c))
       .sort((a, b) => colorCounts[b] - colorCounts[a]);

    let rawPrimary = '#10b981';
    let rawSecondary = '#059669';

    if (sortedVibrantColors.length > 0) {
       rawPrimary = sortedVibrantColors[0];
       rawSecondary = sortedVibrantColors.length > 1 ? sortedVibrantColors[1] : '#111827';
    } else {
       const allColors = Object.keys(colorCounts)
          .filter(c => {
             const cHex = c.replace('#', '');
             if (cHex.length !== 6 && cHex.length !== 3) return false;
             const r = cHex.length === 3 ? parseInt(cHex[0]+cHex[0], 16) : parseInt(cHex.substring(0, 2), 16);
             const g = cHex.length === 3 ? parseInt(cHex[1]+cHex[1], 16) : parseInt(cHex.substring(2, 4), 16);
             const b = cHex.length === 3 ? parseInt(cHex[2]+cHex[2], 16) : parseInt(cHex.substring(4, 6), 16);
             return !(Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && Math.abs(r - b) < 20); 
          })
          .sort((a, b) => getLuminance(a) - getLuminance(b));
          
       if (allColors.length > 0) {
          rawPrimary = allColors[0];
          rawSecondary = allColors.length > 1 ? allColors[1] : '#111827';
       }
    }

    // Traitement HSL pour s'assurer que la couleur est professionnelle et lisible (ni fluo, ni trop claire)
    let [h, s, l] = hexToHsl(rawPrimary);
    
    // On limite la saturation pour éviter l'effet "fluo qui fait mal aux yeux"
    // On baisse la légèreté (luminosité pure) pour que ce soit sombre et très lisible
    if (s > 0.85) s = 0.85; // Max 85% de saturation
    if (l > 0.40) l = 0.40; // Max 40% de clarté (garantit une couleur toujours foncée)
    
    // Si la couleur est jaune (Hue ~60° = 1/6), on la décale ou l'assombrit encore pour faire un beau doré ou moutarde au lieu d'un jaune caca d'oie.
    if (h > 0.12 && h < 0.20 && l > 0.3) {
      l = 0.3; // Les jaunes verts/fluos doivent être très assombris pour paraître olive.
    }

    themePalette.primary = hslToHex(h, s, l);
    themePalette.text = themePalette.primary; // Comme L max = 0.40, la couleur primaire est GARANTIE lisible sur blanc !
    themePalette.onPrimary = 'white'; // Et GARANTIE lisible avec du texte blanc !
    
    // Pour la couleur secondaire, on garde une cohérence visuelle
    let [h2, s2, l2] = hexToHsl(rawSecondary);
    if (s2 > 0.8) s2 = 0.8;
    if (l2 > 0.45) l2 = 0.45;
    themePalette.secondary = hslToHex(h2, s2, l2);
  }

  // Renvoi de la "Base Propre" vers le composant Visuel
  return <KioskSimulator restaurantName={restaurantName} tree={tree} themePalette={themePalette} catalogData={data} />;
}

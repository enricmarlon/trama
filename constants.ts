import type { Palette, StoreData } from './types';

export const STORAGE_KEY = '@trama/store-data-v1';

export const BUSINESS_TYPES = [
  'Ateliê',
  'Loja',
  'Banca',
  'Ambulante',
  'Feirante',
  'Salão',
  'Barbearia',
  'Studio',
  'Clínica',
  'Oficina',
  'Assistência',
  'Outro',
];

export const BASE_COLORS = [
  { name: 'Azul', value: '#3C6E91' },
  { name: 'Verde', value: '#315B48' },
  { name: 'Vermelho', value: '#A94E49' },
  { name: 'Amarelo', value: '#826313' },
  { name: 'Marrom', value: '#79543D' },
  { name: 'Cinza', value: '#5C686C' },
  { name: 'Roxo', value: '#76558E' },
  { name: 'Rosa', value: '#A64F70' },
  { name: 'Laranja', value: '#AA6031' },
];

function hexToHsl(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { hue, saturation, lightness };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = lightness - chroma / 2;
  const [red, green, blue] =
    segment < 1 ? [chroma, secondary, 0]
      : segment < 2 ? [secondary, chroma, 0]
        : segment < 3 ? [0, chroma, secondary]
          : segment < 4 ? [0, secondary, chroma]
            : segment < 5 ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  return `#${[red, green, blue].map((channel) => Math.round((channel + offset) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function mixColors(color: string, other: string, amount: number) {
  const first = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  const second = [1, 3, 5].map((index) => Number.parseInt(other.slice(index, index + 2), 16));
  return `#${first.map((channel, index) => Math.round(channel * (1 - amount) + second[index] * amount).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function createPalette(primary: string): Palette {
  const { hue, saturation } = hexToHsl(primary);
  const secondaryHue = (hue + 34) % 360;
  const secondary = hslToHex(secondaryHue, Math.max(0.3, saturation * 0.72), 0.47);
  const secondaryDeep = hslToHex(secondaryHue, Math.max(0.3, saturation * 0.72), 0.34);
  return {
    ink: '#25362F',
    muted: mixColors('#7A847D', primary, 0.12),
    green: primary,
    paleGreen: mixColors('#FFFFFF', primary, 0.1),
    cream: mixColors('#F7F6F1', primary, 0.035),
    white: '#FFFFFF',
    border: mixColors('#E9E9E2', primary, 0.11),
    orange: secondary,
    paleOrange: mixColors('#FFFFFF', secondary, 0.1),
    red: '#B45448',
    accentDeep: mixColors(primary, '#15231C', 0.2),
    accentMid: mixColors(primary, '#FFFFFF', 0.28),
    accentOn: '#FFFFFF',
    secondaryDeep,
    secondarySoft: mixColors('#FFFFFF', secondary, 0.16),
    canvasShade: mixColors('#EBE7DC', primary, 0.14),
  };
}

export const DEFAULT_PALETTE = createPalette(BASE_COLORS[1].value);

export const initialData: StoreData = {
  products: [],
  sales: [],
  orders: [],
  expenses: [],
  supplies: [],
  offers: [],
};

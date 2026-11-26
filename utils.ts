import type { Palette, Supply } from './types';

export const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function hexToHsl(hex: string) {
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

export function hslToHex(hue: number, saturation: number, lightness: number) {
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

export function mixColors(color: string, other: string, amount: number) {
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

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateDifferenceInDays(startDate: string, endDate: string) {
  const toUtcDay = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtcDay(endDate) - toUtcDay(startDate)) / 86_400_000);
}

export function elapsedDays(startDate: string, endDate: string) {
  return Math.max(0, dateDifferenceInDays(startDate, endDate));
}

export function parseDeliveryDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

export function deliveryCountdown(days: number) {
  if (days > 1) return `Faltam ${days} dias para a entrega`;
  if (days === 1) return 'Falta 1 dia para a entrega';
  if (days === 0) return 'Entrega hoje';
  const overdueDays = Math.abs(days);
  return `Atrasado há ${overdueDays} ${overdueDays === 1 ? 'dia' : 'dias'}`;
}

export function availableSupplyQuantity(supply: Supply, today: string) {
  return Math.max(0, supply.quantity - elapsedDays(supply.registeredDate, today) * supply.dailyUse);
}

export function supplyDaysRemaining(dailyUse: number, quantity: number) {
  return quantity > 0 && dailyUse > 0 ? Math.ceil(quantity / dailyUse) : 0;
}

export const parseAmount = (value: string) => {
  const trimmed = value.trim();
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export const formatLongDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const formatNumericDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR');

export function calculateCommissionAmount(lineTotal: number, percent: number) {
  return Math.round(lineTotal * percent) / 100;
}

export const sameMonth = (date: string, month: Date) => {
  const [year, monthNumber] = date.slice(0, 10).split('-').map(Number);
  return year === month.getFullYear() && monthNumber === month.getMonth() + 1;
};

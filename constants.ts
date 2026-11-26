import type { StoreData } from './types';
import { createPalette } from './utils';

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

export const DEFAULT_PRODUCT_CATEGORIES = ['Casa', 'Cerâmica', 'Têxtil', 'Acessórios'];
export const DEFAULT_SUPPLY_CATEGORIES = ['Matéria-prima', 'Embalagens', 'Ferramentas', 'Outros'];

export const DEFAULT_PALETTE = createPalette(BASE_COLORS[1].value);

export const initialData: StoreData = {
  products: [],
  sales: [],
  orders: [],
  expenses: [],
  supplies: [],
  offers: [],
  productCategories: DEFAULT_PRODUCT_CATEGORIES,
  supplyCategories: DEFAULT_SUPPLY_CATEGORIES,
};

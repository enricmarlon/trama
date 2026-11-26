import { Directory, File, Paths } from 'expo-file-system';
import type {
  CompanyProfile,
  CustomerOrder,
  CustomerOrderItem,
  Expense,
  Offer,
  Product,
  Sale,
  SaleItem,
  StoreData,
  Supply,
} from './types';

const BACKUP_FORMAT = 'trama-backup';
const BACKUP_VERSION = 1;
const IMAGE_DIRECTORY = 'trama-product-images';
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const EXTENSION_MIME_TYPES: Record<string, string> = {
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOptionalString(value: unknown) {
  return value === undefined || isString(value);
}

function isProduct(value: unknown): value is Product {
  return isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isString(value.category)
    && isFiniteNumber(value.price)
    && isFiniteNumber(value.stock)
    && isFiniteNumber(value.lowStockAt)
    && isOptionalString(value.imageUri);
}

function isSaleItem(value: unknown): value is SaleItem {
  return isRecord(value)
    && isString(value.productId)
    && isString(value.name)
    && isFiniteNumber(value.quantity)
    && isFiniteNumber(value.unitPrice)
    && (value.lineDiscount === undefined || isFiniteNumber(value.lineDiscount));
}

function isCustomerOrderItem(value: unknown): value is CustomerOrderItem {
  return isSaleItem(value);
}

function isSale(value: unknown): value is Sale {
  return isRecord(value)
    && isString(value.id)
    && isString(value.date)
    && Array.isArray(value.items)
    && value.items.every(isSaleItem)
    && isFiniteNumber(value.total)
    && isFiniteNumber(value.savings)
    && isOptionalString(value.employeeName);
}

function isCustomerOrder(value: unknown): value is CustomerOrder {
  return isRecord(value)
    && isString(value.id)
    && isString(value.customerName)
    && isString(value.phone)
    && isString(value.createdDate)
    && isString(value.deliveryDate)
    && (value.alertDays === undefined || isFiniteNumber(value.alertDays))
    && Array.isArray(value.items)
    && value.items.every(isCustomerOrderItem)
    && isFiniteNumber(value.total)
    && isFiniteNumber(value.savings)
    && (value.status === 'pending' || value.status === 'delivered')
    && isOptionalString(value.saleId);
}

function isExpense(value: unknown): value is Expense {
  return isRecord(value)
    && isString(value.id)
    && isString(value.date)
    && isString(value.description)
    && isString(value.category)
    && isFiniteNumber(value.amount);
}

function isSupply(value: unknown): value is Supply {
  return isRecord(value)
    && isString(value.id)
    && isString(value.name)
    && isFiniteNumber(value.quantity)
    && isFiniteNumber(value.dailyUse)
    && isString(value.registeredDate);
}

function isOffer(value: unknown): value is Offer {
  return isRecord(value)
    && isString(value.id)
    && isString(value.productId)
    && isString(value.name)
    && (value.discountType === 'percent' || value.discountType === 'fixed')
    && isFiniteNumber(value.value)
    && typeof value.active === 'boolean';
}

function isCompanyProfile(value: unknown): value is CompanyProfile {
  return isRecord(value)
    && isString(value.businessType)
    && isOptionalString(value.customBusinessType)
    && isString(value.name)
    && isString(value.baseColor)
    && Array.isArray(value.employees)
    && value.employees.every(isString);
}

function isStoreData(value: unknown): value is StoreData {
  return isRecord(value)
    && Array.isArray(value.products)
    && value.products.every(isProduct)
    && Array.isArray(value.sales)
    && value.sales.every(isSale)
    && Array.isArray(value.orders)
    && value.orders.every(isCustomerOrder)
    && Array.isArray(value.expenses)
    && value.expenses.every(isExpense)
    && Array.isArray(value.supplies)
    && value.supplies.every(isSupply)
    && Array.isArray(value.offers)
    && value.offers.every(isOffer)
    && (value.company === undefined || isCompanyProfile(value.company));
}

function getImageExtension(mimeType: string) {
  const extension = Object.prototype.hasOwnProperty.call(IMAGE_EXTENSIONS, mimeType)
    ? IMAGE_EXTENSIONS[mimeType]
    : undefined;
  if (!extension) throw new Error(`Formato de imagem não suportado: ${mimeType}`);
  return extension;
}

function getImageMimeType(file: File) {
  const mimeType = file.type.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(IMAGE_EXTENSIONS, mimeType)) return mimeType;
  const extension = file.extension.replace(/^\./, '').toLowerCase();
  const inferredMimeType = Object.prototype.hasOwnProperty.call(EXTENSION_MIME_TYPES, extension)
    ? EXTENSION_MIME_TYPES[extension]
    : undefined;
  if (inferredMimeType) return inferredMimeType;
  throw new Error('Não foi possível identificar o formato de uma foto de produto.');
}

function parseImageDataUri(uri: string) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(uri);
  if (!match) throw new Error('O backup contém uma foto em formato inválido.');
  const mimeType = match[1].toLowerCase();
  getImageExtension(mimeType);
  return { mimeType, base64: match[2].replace(/\s/g, '') };
}

function decodeBase64(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  if (!value || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('O backup contém uma foto corrompida.');
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((value.length / 4) * 3 - padding);
  let outputIndex = 0;

  for (let index = 0; index < value.length; index += 4) {
    const first = alphabet.indexOf(value[index]);
    const second = alphabet.indexOf(value[index + 1]);
    const third = value[index + 2] === '=' ? 0 : alphabet.indexOf(value[index + 2]);
    const fourth = value[index + 3] === '=' ? 0 : alphabet.indexOf(value[index + 3]);
    const combined = (first << 18) | (second << 12) | (third << 6) | fourth;
    if (outputIndex < bytes.length) bytes[outputIndex++] = (combined >> 16) & 0xff;
    if (outputIndex < bytes.length) bytes[outputIndex++] = (combined >> 8) & 0xff;
    if (outputIndex < bytes.length) bytes[outputIndex++] = combined & 0xff;
  }

  return bytes;
}

function getProductImageDirectory() {
  const directory = new Directory(Paths.document, IMAGE_DIRECTORY);
  if (!directory.exists) directory.create();
  return directory;
}

export async function persistProductImage(uri: string) {
  const source = new File(uri);
  if (!source.exists) throw new Error('O arquivo da foto selecionada não está mais disponível.');
  const extension = getImageExtension(getImageMimeType(source));
  const directory = getProductImageDirectory();
  const destination = new File(
    directory,
    `product-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
  );
  await source.copy(destination);
  return destination.uri;
}

export async function createBackupFile(data: StoreData) {
  const products: Product[] = [];
  for (const product of data.products) {
    if (!product.imageUri) {
      products.push(product);
      continue;
    }

    try {
      let imageDataUri: string;
      if (product.imageUri.startsWith('data:')) {
        const { mimeType, base64 } = parseImageDataUri(product.imageUri);
        imageDataUri = `data:${mimeType};base64,${base64}`;
      } else {
        const imageFile = new File(product.imageUri);
        if (!imageFile.exists) throw new Error('arquivo ausente');
        const mimeType = getImageMimeType(imageFile);
        imageDataUri = `data:${mimeType};base64,${await imageFile.base64()}`;
      }
      products.push({ ...product, imageUri: imageDataUri });
    } catch (error) {
      const reason = error instanceof Error ? ` ${error.message}` : '';
      throw new Error(`Não foi possível incluir a foto de "${product.name}" no backup.${reason}`);
    }
  }

  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { ...data, products },
  };
  const file = new File(
    Paths.cache,
    `trama-backup-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
  file.create();
  try {
    await file.write(JSON.stringify(backup));
    return file;
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
}

export async function readBackupFile(uri: string): Promise<StoreData> {
  const file = new File(uri);
  const contents = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('O arquivo selecionado não contém um JSON válido.');
  }

  if (!isRecord(parsed)
    || parsed.format !== BACKUP_FORMAT
    || parsed.version !== BACKUP_VERSION
    || !isStoreData(parsed.data)) {
    throw new Error('O arquivo não é um backup compatível do Trama ou está incompleto.');
  }

  const data = parsed.data;
  const directory = getProductImageDirectory();
  const products: Product[] = [];

  for (let index = 0; index < data.products.length; index += 1) {
    const product = data.products[index];
    if (!product.imageUri) {
      products.push(product);
      continue;
    }

    const { mimeType, base64 } = parseImageDataUri(product.imageUri);
    const extension = getImageExtension(mimeType);
    const destination = new File(
      directory,
      `imported-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extension}`,
    );
    destination.create();
    await destination.write(decodeBase64(base64));
    products.push({ ...product, imageUri: destination.uri });
  }

  return { ...data, products };
}

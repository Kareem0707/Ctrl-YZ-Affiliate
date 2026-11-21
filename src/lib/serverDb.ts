import fs from 'fs';
import path from 'path';
import {
  Product,
  Marketer,
  Order,
  OrderStatus,
  WithdrawalRequest,
  GovernorateShipping,
  PlatformSettings,
} from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_MARKETERS,
  INITIAL_ORDERS,
  INITIAL_WITHDRAWALS,
  INITIAL_GOVERNORATES,
  INITIAL_SETTINGS,
} from './mockData';

export interface DatabaseSchema {
  version: number;
  lastModified: number;
  products: Product[];
  marketers: Marketer[];
  orders: Order[];
  withdrawals: WithdrawalRequest[];
  governorates: GovernorateShipping[];
  settings: PlatformSettings;
  syncEvents: Array<{
    id: string;
    type: 'order_created' | 'order_updated' | 'order_deleted' | 'product_saved' | 'product_deleted' | 'withdrawal_created' | 'withdrawal_updated' | 'marketer_saved' | 'settings_updated';
    timestamp: number;
    entityId?: string;
  }>;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

let inMemoryCache: DatabaseSchema | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function ensureDbDirectory(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

export function getInitialDatabase(): DatabaseSchema {
  return {
    version: 1,
    lastModified: Date.now(),
    products: INITIAL_PRODUCTS,
    marketers: INITIAL_MARKETERS,
    orders: INITIAL_ORDERS,
    withdrawals: INITIAL_WITHDRAWALS,
    governorates: INITIAL_GOVERNORATES,
    settings: INITIAL_SETTINGS,
    syncEvents: [
      {
        id: `ev-init-${Date.now()}`,
        type: 'settings_updated',
        timestamp: Date.now(),
      },
    ],
  };
}

export async function readDatabase(): Promise<DatabaseSchema> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  ensureDbDirectory();

  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialDatabase();
    await writeDatabase(initial);
    inMemoryCache = initial;
    return initial;
  }

  try {
    const raw = await fs.promises.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    
    // Ensure all required collections exist
    if (!parsed.products || parsed.products.length === 0) parsed.products = INITIAL_PRODUCTS;
    if (!parsed.marketers) parsed.marketers = INITIAL_MARKETERS;
    if (!parsed.orders) parsed.orders = INITIAL_ORDERS;
    if (!parsed.withdrawals) parsed.withdrawals = INITIAL_WITHDRAWALS;
    if (!parsed.governorates) parsed.governorates = INITIAL_GOVERNORATES;
    if (!parsed.settings) parsed.settings = INITIAL_SETTINGS;
    if (!parsed.syncEvents) parsed.syncEvents = [];

    inMemoryCache = parsed;
    return parsed;
  } catch (error) {
    console.error('Error reading database file, using fallback:', error);
    const fallback = getInitialDatabase();
    inMemoryCache = fallback;
    return fallback;
  }
}

export async function writeDatabase(data: DatabaseSchema): Promise<void> {
  ensureDbDirectory();
  data.lastModified = Date.now();
  // Keep only the latest 100 sync events to avoid unbounded growth
  if (data.syncEvents.length > 100) {
    data.syncEvents = data.syncEvents.slice(-100);
  }

  inMemoryCache = data;

  // Queue write operations sequentially to prevent corruption
  writeQueue = writeQueue.then(async () => {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      await fs.promises.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      await fs.promises.rename(tempFile, DB_FILE);
    } catch (err) {
      console.error('Error writing database to disk:', err);
    }
  });

  await writeQueue;
}

export function logSyncEvent(
  db: DatabaseSchema,
  type: DatabaseSchema['syncEvents'][0]['type'],
  entityId?: string
): void {
  const event = {
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    timestamp: Date.now(),
    entityId,
  };
  db.syncEvents.push(event);
  db.lastModified = Date.now();
}

// Change from CDN import to local module import
import Dexie from 'dexie';

// Database configuration
const DB_NAME = 'AppCacheDB';
const DB_VERSION = 1;
const TTL_PRODUCTS = 60 * 60 * 1000; // 1 hour in milliseconds
const TTL_CUSTOMERS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Initialize Dexie database
const db = new Dexie(DB_NAME);

// Define schema
db.version(DB_VERSION).stores({
  products: 'id, fetchedAt, name, item_code, price, stock_qty',
  customers: 'id, fetchedAt, name, customer_name, mobile_no',
  orders: '++id, status, date, syncedAt, customer_id, total_amount',
  settings: 'key, value, updatedAt'
});

// Add hooks for logging
db.products.hook('creating', (primKey, obj, trans) => {
  console.log('Adding product to cache:', obj);
});

db.customers.hook('creating', (primKey, obj, trans) => {
  console.log('Adding customer to cache:', obj);
});

db.orders.hook('creating', (primKey, obj, trans) => {
  console.log('Queueing order:', obj);
});

// Error handling for quota exceeded - Fix: Use db.open() instead of db.ready()
// Remove the db.open().catch() block entirely and handle errors in individual functions
// For example, in your database operation functions:

// Memory fallback for quota exceeded scenarios
let memoryCache = {
  products: new Map(),
  customers: new Map(),
  orders: [],
  settings: new Map()
};

let useMemoryFallback = false;

function initializeMemoryFallback() {
  useMemoryFallback = true;
  console.log('Using memory fallback for caching');
}

// Product management functions
export async function getProducts() {
  try {
    if (useMemoryFallback) {
      return Array.from(memoryCache.products.values());
    }
    
    // Get cached products
    const cachedProducts = await db.products.toArray();
    
    // Return cached data immediately if available
    if (cachedProducts.length > 0) {
      console.log(`Returning ${cachedProducts.length} cached products`);
      
      // Start background refresh
      refreshProductsInBackground();
      
      return cachedProducts;
    }
    
    // No cache, fetch from network
    return await fetchAndCacheProducts();
  } catch (error) {
    console.error('Failed to get products:', error);
    if (useMemoryFallback) {
      return Array.from(memoryCache.products.values());
    }
    return [];
  }
}

async function fetchAndCacheProducts() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const products = await response.json();
    const timestamp = Date.now();
    
    // Add fetchedAt timestamp to each product
    const productsWithTimestamp = products.map(product => ({
      ...product,
      fetchedAt: timestamp
    }));
    
    if (useMemoryFallback) {
      productsWithTimestamp.forEach(product => {
        memoryCache.products.set(product.id, product);
      });
    } else {
      // Use transaction for bulk operations
      await db.transaction('rw', db.products, async () => {
        await db.products.clear();
        await db.products.bulkPut(productsWithTimestamp);
      });
    }
    
    console.log(`Cached ${products.length} products`);
    return productsWithTimestamp;
  } catch (error) {
    console.error('Failed to fetch products:', error);
    throw error;
  }
}

async function refreshProductsInBackground() {
  try {
    console.log('Refreshing products in background');
    await fetchAndCacheProducts();
    
    // Notify UI about updated data
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('products-updated'));
    }
  } catch (error) {
    console.log('Background refresh failed, using cached data');
  }
}

export async function cleanStaleProducts() {
  try {
    const cutoffTime = Date.now() - TTL_PRODUCTS;
    
    if (useMemoryFallback) {
      for (const [key, product] of memoryCache.products) {
        if (product.fetchedAt < cutoffTime) {
          memoryCache.products.delete(key);
        }
      }
      return;
    }
    
    await db.transaction('rw', db.products, async () => {
      const staleCount = await db.products
        .where('fetchedAt')
        .below(cutoffTime)
        .delete();
      
      if (staleCount > 0) {
        console.log(`Cleaned ${staleCount} stale products`);
      }
    });
  } catch (error) {
    console.error('Failed to clean stale products:', error);
  }
}

// Customer management functions
export async function getCustomers() {
  try {
    if (useMemoryFallback) {
      return Array.from(memoryCache.customers.values());
    }
    
    const cachedCustomers = await db.customers.toArray();
    
    if (cachedCustomers.length > 0) {
      console.log(`Returning ${cachedCustomers.length} cached customers`);
      refreshCustomersInBackground();
      return cachedCustomers;
    }
    
    return await fetchAndCacheCustomers();
  } catch (error) {
    console.error('Failed to get customers:', error);
    return useMemoryFallback ? Array.from(memoryCache.customers.values()) : [];
  }
}

async function fetchAndCacheCustomers() {
  try {
    const response = await fetch('/api/customers');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const customers = await response.json();
    const timestamp = Date.now();
    
    const customersWithTimestamp = customers.map(customer => ({
      ...customer,
      fetchedAt: timestamp
    }));
    
    if (useMemoryFallback) {
      customersWithTimestamp.forEach(customer => {
        memoryCache.customers.set(customer.id, customer);
      });
    } else {
      await db.transaction('rw', db.customers, async () => {
        await db.customers.clear();
        await db.customers.bulkPut(customersWithTimestamp);
      });
    }
    
    console.log(`Cached ${customers.length} customers`);
    return customersWithTimestamp;
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    throw error;
  }
}

async function refreshCustomersInBackground() {
  try {
    console.log('Refreshing customers in background');
    await fetchAndCacheCustomers();
    
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('customers-updated'));
    }
  } catch (error) {
    console.log('Background customer refresh failed');
  }
}

export async function cleanStaleCustomers() {
  try {
    const cutoffTime = Date.now() - TTL_CUSTOMERS;
    
    if (useMemoryFallback) {
      for (const [key, customer] of memoryCache.customers) {
        if (customer.fetchedAt < cutoffTime) {
          memoryCache.customers.delete(key);
        }
      }
      return;
    }
    
    await db.transaction('rw', db.customers, async () => {
      const staleCount = await db.customers
        .where('fetchedAt')
        .below(cutoffTime)
        .delete();
      
      if (staleCount > 0) {
        console.log(`Cleaned ${staleCount} stale customers`);
      }
    });
  } catch (error) {
    console.error('Failed to clean stale customers:', error);
  }
}

// Order queue management
export async function queueOrder(orderDetails) {
  try {
    const order = {
      ...orderDetails,
      status: 'pending',
      date: new Date().toISOString(),
      syncedAt: null
    };
    
    if (useMemoryFallback) {
      order.id = Date.now(); // Simple ID generation for memory fallback
      memoryCache.orders.push(order);
      console.log('Order queued in memory:', order.id);
      return order.id;
    }
    
    const id = await db.orders.add(order);
    console.log('Order queued:', id);
    
    // Notify UI about new pending order
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('order-queued', { detail: { id, order } }));
    }
    
    return id;
  } catch (error) {
    console.error('Failed to queue order:', error);
    throw error;
  }
}

export async function getPendingOrders() {
  try {
    if (useMemoryFallback) {
      return memoryCache.orders.filter(order => order.status === 'pending');
    }
    
    return await db.orders
      .where('status')
      .equals('pending')
      .toArray();
  } catch (error) {
    console.error('Failed to get pending orders:', error);
    return [];
  }
}

export async function syncPendingOrders() {
  try {
    const pendingOrders = await getPendingOrders();
    
    if (pendingOrders.length === 0) {
      console.log('No pending orders to sync');
      return { synced: 0, failed: 0 };
    }
    
    console.log(`Syncing ${pendingOrders.length} pending orders`);
    
    let synced = 0;
    let failed = 0;
    
    for (const order of pendingOrders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(order)
        });
        
        if (response.ok) {
          // Mark as synced
          const syncedOrder = {
            ...order,
            status: 'synced',
            syncedAt: new Date().toISOString()
          };
          
          if (useMemoryFallback) {
            const index = memoryCache.orders.findIndex(o => o.id === order.id);
            if (index !== -1) {
              memoryCache.orders[index] = syncedOrder;
            }
          } else {
            await db.orders.put(syncedOrder);
          }
          
          synced++;
          console.log(`Order ${order.id} synced successfully`);
        } else {
          failed++;
          console.error(`Failed to sync order ${order.id}: HTTP ${response.status}`);
        }
      } catch (error) {
        failed++;
        console.error(`Failed to sync order ${order.id}:`, error);
      }
    }
    
    // Notify UI about sync completion
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('orders-synced', { 
        detail: { synced, failed } 
      }));
    }
    
    console.log(`Sync completed: ${synced} synced, ${failed} failed`);
    return { synced, failed };
  } catch (error) {
    console.error('Failed to sync pending orders:', error);
    return { synced: 0, failed: 0 };
  }
}

// Settings management
export async function setSetting(key, value) {
  try {
    const setting = {
      key,
      value,
      updatedAt: new Date().toISOString()
    };
    
    if (useMemoryFallback) {
      memoryCache.settings.set(key, setting);
    } else {
      await db.settings.put(setting);
    }
  } catch (error) {
    console.error('Failed to set setting:', error);
  }
}

export async function getSetting(key, defaultValue = null) {
  try {
    if (useMemoryFallback) {
      const setting = memoryCache.settings.get(key);
      return setting ? setting.value : defaultValue;
    }
    
    const setting = await db.settings.get(key);
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error('Failed to get setting:', error);
    return defaultValue;
  }
}

// Cleanup functions
export async function cleanupExpiredData() {
  try {
    await Promise.all([
      cleanStaleProducts(),
      cleanStaleCustomers()
    ]);
    console.log('Expired data cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup expired data:', error);
  }
}

// Database statistics
export async function getDatabaseStats() {
  try {
    if (useMemoryFallback) {
      return {
        products: memoryCache.products.size,
        customers: memoryCache.customers.size,
        orders: memoryCache.orders.length,
        settings: memoryCache.settings.size,
        usingMemoryFallback: true
      };
    }
    
    const [productsCount, customersCount, ordersCount, settingsCount] = await Promise.all([
      db.products.count(),
      db.customers.count(),
      db.orders.count(),
      db.settings.count()
    ]);
    
    return {
      products: productsCount,
      customers: customersCount,
      orders: ordersCount,
      settings: settingsCount,
      usingMemoryFallback: false
    };
  } catch (error) {
    console.error('Failed to get database stats:', error);
    return {
      products: 0,
      customers: 0,
      orders: 0,
      settings: 0,
      usingMemoryFallback: useMemoryFallback
    };
  }
}

// Initialize cleanup interval
if (typeof window !== 'undefined') {
  // Clean up expired data every hour
  setInterval(cleanupExpiredData, 60 * 60 * 1000);
  
  // Listen for online events to trigger sync
  window.addEventListener('online', () => {
    console.log('Network connection restored, syncing pending orders');
    syncPendingOrders();
  });
}

export { db };
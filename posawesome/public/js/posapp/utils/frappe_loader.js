/**
 * Clear browser cache for specific resources
 * @returns {Promise} Resolves when cache is cleared
 */
async function clearResourceCache() {
    if ('caches' in window) {
        try {
            // Clear specific cache storage
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter(name => name.includes('frappe-assets') || name.includes('posawesome'))
                    .map(name => caches.delete(name))
            );
        } catch (error) {
            console.warn('Cache API not fully supported or error clearing cache:', error);
        }
    }
}

/**
 * Utility to ensure Frappe is fully loaded before executing code
 * @param {Function} callback Function to execute when Frappe is ready
 * @param {Object} options Configuration options
 * @param {number} options.timeout Timeout in milliseconds (default: 30000)
 * @param {number} options.interval Check interval in milliseconds (default: 100)
 * @param {boolean} options.clearCache Whether to clear cache if loading fails (default: true)
 * @returns {Promise} Resolves when Frappe is ready
 */
export function waitForFrappe(callback, options = {}) {
    const timeout = options.timeout || 30000;
    const interval = options.interval || 100;
    const shouldClearCache = options.clearCache !== false;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const attemptLoad = async (resolve, reject) => {
        // If Frappe is already loaded and ready
        if (window.frappe && 
            window.frappe.provide && 
            window.frappe._ && 
            window.jQuery && 
            window.frappe.ready_events) {
            try {
                const result = await callback();
                resolve(result);
            } catch (error) {
                reject(error);
            }
            return true;
        }
        return false;
    };

    return new Promise(async (resolve, reject) => {
        // Try immediate load first
        if (await attemptLoad(resolve, reject)) return;

        let elapsed = 0;
        const timer = setInterval(async () => {
            elapsed += interval;

            // Check if Frappe and all required dependencies are loaded
            if (await attemptLoad(resolve, reject)) {
                clearInterval(timer);
                return;
            }

            // Handle timeout
            if (elapsed >= timeout) {
                clearInterval(timer);
                
                // If we should try clearing cache and haven't maxed out retries
                if (shouldClearCache && retryCount < MAX_RETRIES) {
                    retryCount++;
                    console.log(`Attempt ${retryCount}: Clearing cache and retrying Frappe load...`);
                    
                    try {
                        await clearResourceCache();
                        // Reset elapsed time and continue waiting
                        elapsed = 0;
                        
                        // If this was our last retry, show a message to the user
                        if (retryCount === MAX_RETRIES) {
                            console.warn('Max retries reached. If problems persist, please hard refresh (Ctrl+Shift+R)');
                        }
                    } catch (error) {
                        console.error('Error clearing cache:', error);
                        reject(new Error('Failed to load Frappe and cache clear failed'));
                    }
                } else {
                    reject(new Error('Timeout waiting for Frappe to load'));
                }
            }
        }, interval);
    });
}

/**
 * Decorator to ensure a method is only called after Frappe is loaded
 * @param {Object} options Configuration options passed to waitForFrappe
 * @returns {Function} Decorated method
 */
export function requireFrappe(options = {}) {
    return function(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = function(...args) {
            return waitForFrappe(() => originalMethod.apply(this, args), options);
        };
        
        return descriptor;
    };
}

/**
 * Check if Frappe is fully loaded
 * @returns {boolean}
 */
export function isFrappeReady() {
    return !!(window.frappe && 
              window.frappe.provide && 
              window.frappe._ && 
              window.jQuery && 
              window.frappe.ready_events);
}

/**
 * Queue a function to run when Frappe is ready
 * @param {Function} fn Function to execute
 */
export function onFrappeReady(fn) {
    if (isFrappeReady()) {
        fn();
    } else {
        document.addEventListener('FrappeReady', fn);
    }
}

// Dispatch a custom event when Frappe is ready
if (!isFrappeReady()) {
    const checkFrappe = setInterval(() => {
        if (isFrappeReady()) {
            clearInterval(checkFrappe);
            document.dispatchEvent(new Event('FrappeReady'));
        }
    }, 100);
}

/**
 * Utility functions for cache management
 */

/**
 * Clear all caches (both client and server-side)
 * @returns {Promise} Resolves when all caches are cleared
 */
export async function clearAllCaches() {
    try {
        // Clear client-side caches
        await clearClientCache();
        
        // Clear server-side cache
        await clearServerCache();
        
        return true;
    } catch (error) {
        console.error('Error clearing caches:', error);
        throw error;
    }
}

/**
 * Clear client-side caches
 * @returns {Promise} Resolves when client cache is cleared
 */
async function clearClientCache() {
    try {
        // Clear browser caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter(name => name.includes('frappe-assets') || name.includes('posawesome'))
                    .map(name => caches.delete(name))
            );
        }

        // Clear POS-specific localStorage items
        Object.keys(localStorage)
            .filter(key => 
                key.startsWith('frappe:') || 
                key.startsWith('pos:') || 
                key.startsWith('POS:') || 
                key.startsWith('POSAwesome:') ||
                key.includes('POS_Profile')
            )
            .forEach(key => localStorage.removeItem(key));

        // Clear POS-specific sessionStorage items
        Object.keys(sessionStorage)
            .filter(key => 
                key.startsWith('frappe:') || 
                key.startsWith('pos:') || 
                key.startsWith('POS:') || 
                key.startsWith('POSAwesome:') ||
                key.includes('POS_Profile')
            )
            .forEach(key => sessionStorage.removeItem(key));

        return true;
    } catch (error) {
        console.warn('Error clearing client cache:', error);
        return false;
    }
}

/**
 * Clear server-side cache
 * @returns {Promise} Resolves when server cache is cleared
 */
async function clearServerCache() {
    try {
        // Clear Frappe server cache without args
        await frappe.call('frappe.sessions.clear');

        // Clear POS-specific caches
        await frappe.call({
            method: 'frappe.desk.doctype.workspace.workspace.clear_cache'
        });
        
        // Clear system cache
        await frappe.call({
            method: 'frappe.utils.change_log.clear_cache'
        });

        return true;
    } catch (error) {
        console.error('Error clearing server cache:', error);
        throw error;
    }
}

/**
 * Check if cache clearing is needed
 * @returns {Promise<boolean>} True if cache should be cleared
 */
export async function shouldClearCache() {
    try {
        const response = await frappe.call({
            method: 'posawesome.posawesome.api.utilities.check_cache_status'
        });
        return response?.message?.needs_clearing || false;
    } catch (error) {
        console.warn('Error checking cache status:', error);
        return false;
    }
}

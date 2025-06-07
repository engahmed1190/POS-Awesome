import { createVuetify } from 'vuetify';
import { createApp } from 'vue';
import eventBus from './bus';
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import Home from './Home.vue';
// Cache Database Integration
import * as cacheDB from '../cache-db.js';


frappe.provide('frappe.PosApp');


frappe.PosApp.posapp = class {
    constructor({ parent }) {
        this.$parent = $(document);
        this.page = parent.page;
        this.make_body();

    }
    make_body() {
        this.$el = this.$parent.find('.main-section');
        const vuetify = createVuetify(
            {
                components,
                directives,
                locale: {
                    rtl: frappe.utils.is_rtl()
                },
                theme: {
                    themes: {
                        light: {
                            background: '#FFFFFF',
                            primary: '#0097A7',
                            secondary: '#00BCD4',
                            accent: '#9575CD',
                            success: '#66BB6A',
                            info: '#2196F3',
                            warning: '#FF9800',
                            error: '#E86674',
                            orange: '#E65100',
                            golden: '#A68C59',
                            badge: '#F5528C',
                            customPrimary: '#085294',
                        },
                    },
                },
            }
        );
        const app = createApp(Home)
        app.use(eventBus);
        app.use(vuetify)
        app.mount(this.$el[0]);

        if (!document.querySelector('link[rel="manifest"]')) {
            const link = document.createElement('link');
            link.rel = 'manifest';
            link.href = '/manifest.json';
            document.head.appendChild(link);
        }

        // Service Worker Registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js', {
                        scope: '/'
                    });

                    console.log('SW: Service Worker registered successfully:', registration.scope);

                    // Handle service worker updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('SW: New service worker found, installing...');

                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('SW: New service worker installed, prompting for update');
                                showUpdateAvailableNotification();
                            }
                        });
                    });

                    // Listen for controlling service worker changes
                    navigator.serviceWorker.addEventListener('controllerchange', () => {
                        console.log('SW: Controller changed, reloading page');
                        window.location.reload();
                    });

                } catch (error) {
                    console.error('SW: Service Worker registration failed:', error);
                }
            });
        }



        // Make cache database available globally for debugging
        window.cacheDB = cacheDB;

        // Initialize cache database
        async function initializeCacheDB() {
            try {
                console.log('Initializing cache database...');

                // Load initial data
                await Promise.all([
                    cacheDB.getProducts(),
                    cacheDB.getCustomers()
                ]);

                console.log('Cache database initialized successfully');

                // Set up periodic cleanup
                setInterval(() => {
                    cacheDB.cleanupExpiredData();
                }, 60 * 60 * 1000); // Every hour

            } catch (error) {
                console.error('Failed to initialize cache database:', error);
            }
        }

        // Enhanced offline detection
        function setupOfflineHandling() {
            let isOnline = navigator.onLine;

            function updateOnlineStatus() {
                const wasOnline = isOnline;
                isOnline = navigator.onLine;

                if (!wasOnline && isOnline) {
                    console.log('Connection restored, syncing pending data...');
                    handleConnectionRestored();
                } else if (wasOnline && !isOnline) {
                    console.log('Connection lost, switching to offline mode...');
                    handleConnectionLost();
                }

                // Update UI indicators
                document.body.classList.toggle('offline', !isOnline);

                // Dispatch custom event for components
                window.dispatchEvent(new CustomEvent('connection-change', {
                    detail: { isOnline }
                }));
            }

            async function handleConnectionRestored() {
                try {
                    // Sync pending orders
                    const syncResult = await cacheDB.syncPendingOrders();

                    if (syncResult.synced > 0) {
                        showNotification(`${syncResult.synced} orders synced successfully`, 'success');
                    }

                    if (syncResult.failed > 0) {
                        showNotification(`${syncResult.failed} orders failed to sync`, 'warning');
                    }

                    // Refresh cached data
                    await Promise.all([
                        cacheDB.getProducts(),
                        cacheDB.getCustomers()
                    ]);

                } catch (error) {
                    console.error('Failed to handle connection restoration:', error);
                }
            }

            function handleConnectionLost() {
                showNotification('Working offline - data will sync when connection is restored', 'info');
            }

            // Event listeners
            window.addEventListener('online', updateOnlineStatus);
            window.addEventListener('offline', updateOnlineStatus);

            // Initial status
            updateOnlineStatus();
        }

        // Enhanced product loading with cache
        async function loadProducts() {
            try {
                showLoadingIndicator('Loading products...');

                // Get products from cache (with background refresh)
                const products = await cacheDB.getProducts();

                // Update UI with products
                updateProductsUI(products);

                hideLoadingIndicator();

                // Listen for background updates
                window.addEventListener('products-updated', () => {
                    console.log('Products updated in background, refreshing UI...');
                    loadProducts(); // Reload to get fresh data
                });

            } catch (error) {
                console.error('Failed to load products:', error);
                hideLoadingIndicator();
                showNotification('Failed to load products', 'error');
            }
        }

        // Enhanced customer loading with cache
        async function loadCustomers() {
            try {
                const customers = await cacheDB.getCustomers();
                updateCustomersUI(customers);

                // Listen for background updates
                window.addEventListener('customers-updated', () => {
                    console.log('Customers updated in background, refreshing UI...');
                    loadCustomers();
                });

            } catch (error) {
                console.error('Failed to load customers:', error);
                showNotification('Failed to load customers', 'error');
            }
        }

        // Enhanced order submission with offline queue
        async function submitOrder(orderData) {
            try {
                if (navigator.onLine) {
                    // Try to submit directly
                    const response = await fetch('/api/orders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(orderData)
                    });

                    if (response.ok) {
                        showNotification('Order submitted successfully', 'success');
                        return await response.json();
                    } else {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } else {
                    throw new Error('Offline');
                }
            } catch (error) {
                console.log('Failed to submit order online, queuing for later:', error);

                // Queue for offline submission
                const orderId = await cacheDB.queueOrder(orderData);
                showNotification('Order saved offline - will sync when online', 'info');

                return { id: orderId, status: 'queued' };
            }
        }

        // Notification system
        function showNotification(message, type = 'info') {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;

            // Add to page
            document.body.appendChild(notification);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        // Update available notification
        function showUpdateAvailableNotification() {
            const notification = document.createElement('div');
            notification.className = 'notification notification-update';
            notification.innerHTML = `
            <span>A new version is available!</span>
            <button onclick="updateServiceWorker()">Update Now</button>
            <button onclick="this.parentElement.remove()">Later</button>
          `;

            document.body.appendChild(notification);
        }

        // Update service worker
        function updateServiceWorker() {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            }
        }

        // Initialize everything
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('Initializing POS Awesome with offline-first architecture...');

            try {
                // Initialize cache database
                await initializeCacheDB();

                // Setup offline handling
                setupOfflineHandling();

                // Load initial data
                await Promise.all([
                    loadProducts(),
                    loadCustomers()
                ]);

                console.log('POS Awesome initialized successfully');

            } catch (error) {
                console.error('Failed to initialize POS Awesome:', error);
                showNotification('Failed to initialize application', 'error');
            }
        });
    }
    setup_header() {

    }

};

<template>
	<v-menu :min-width="240" :close-on-content-click="true" location="bottom end" :offset="[0, 4]">
		<template #activator="{ props }">
			<v-btn v-bind="props" color="primary" variant="elevated" class="menu-btn-compact">
				{{ __("Menu") }}
				<v-icon end size="16" class="ml-1">mdi-menu-down</v-icon>
			</v-btn>
		</template>
		<v-card class="menu-card-compact" elevation="12">
			<div class="menu-header-compact">
				<v-icon color="primary" size="20">mdi-menu</v-icon>
				<span class="menu-header-text-compact">{{ __("Actions") }}</span>
			</div>
			<v-list density="compact" class="menu-list-compact">
				<v-list-item
					v-if="!posProfile.posa_hide_closing_shift"
					@click="$emit('close-shift')"
					class="menu-item-compact primary-action"
				>
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact primary-icon">
							<v-icon color="white" size="16">mdi-content-save-move-outline</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							__("Close Shift")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("End current session")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>

				<v-list-item
					v-if="posProfile.posa_allow_print_last_invoice"
					@click="$emit('print-last-invoice')"
					:disabled="!lastInvoiceId"
					class="menu-item-compact secondary-action"
				>
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact secondary-icon">
							<v-icon color="white" size="16">mdi-printer</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							__("Print Last Invoice")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("Reprint previous transaction")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>

				<v-list-item @click="$emit('sync-invoices')" class="menu-item-compact info-action">
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact info-icon">
							<v-icon color="white" size="16">mdi-sync</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							__("Sync Offline Invoices")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("Upload pending transactions")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>

				<v-list-item @click="$emit('toggle-offline')" class="menu-item-compact warning-action">
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact warning-icon">
							<v-icon color="white" size="16">mdi-wifi-off</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							manualOffline ? __("Go Online") : __("Go Offline")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">
							{{
								manualOffline
									? __("Disable offline mode")
									: __("Work without server connection")
							}}
						</v-list-item-subtitle>
					</div>
				</v-list-item>

				<v-list-item
					@click="$emit('clear-cache')"
					:disabled="manualOffline || !networkOnline || !serverOnline"
					class="menu-item-compact neutral-action"
				>
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact neutral-icon">
							<v-icon color="white" size="16">mdi-delete-sweep-outline</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							__("Clear Cache")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("Remove local data and refresh")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>

				<v-divider class="menu-section-divider-compact"></v-divider>

				<v-list-item @click="$emit('show-about')" class="menu-item-compact neutral-action">
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact neutral-icon">
							<v-icon color="white" size="16">mdi-information-outline</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							__("About")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("App information")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>

				<!-- Language selection menu item -->
				<v-list-item 
					v-if="hasPOSProfile"
					@click="showLanguageDialog = true" 
					class="menu-item-compact primary-action"
				>
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact primary-icon">
							<v-icon color="white" size="16">mdi-translate</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							__("Language")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("Change interface language")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>

				<!-- Theme toggle menu item -->
				<v-list-item @click="$emit('toggle-theme')" class="menu-item-compact info-action">
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact info-icon">
							<v-icon color="white" size="16">{{
								isDark ? "mdi-white-balance-sunny" : "mdi-moon-waning-crescent"
							}}</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							isDark ? __("Light Mode") : __("Dark Mode")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("Switch theme appearance")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>

				<v-list-item @click="$emit('logout')" class="menu-item-compact danger-action">
					<template v-slot:prepend>
						<div class="menu-icon-wrapper-compact danger-icon">
							<v-icon color="white" size="16">mdi-logout</v-icon>
						</div>
					</template>
					<div class="menu-content-compact">
						<v-list-item-title class="menu-item-title-compact">{{
							__("Logout")
						}}</v-list-item-title>
						<v-list-item-subtitle class="menu-item-subtitle-compact">{{
							__("Sign out of session")
						}}</v-list-item-subtitle>
					</div>
				</v-list-item>
			</v-list>
		</v-card>
	</v-menu>

	<!-- Language Selection Dialog -->
	<v-dialog v-model="showLanguageDialog" max-width="400" persistent>
		<v-card>
			<v-card-title class="text-h6 d-flex align-center">
				<v-icon start color="primary" class="mr-2">mdi-translate</v-icon>
				{{ __("Select Language") }}
			</v-card-title>

			<v-card-text>
				<div class="text-body-2 mb-3">
					{{ __("Choose your preferred language for the POS interface") }}
				</div>

				<v-select
					v-model="selectedLanguage"
					:items="availableLanguages"
					item-title="name"
					item-value="code"
					:label="__('Language')"
					variant="outlined"
					density="compact"
					:loading="loading"
					:disabled="loading"
					:hint="__('Select your preferred interface language')"
					persistent-hint
					class="language-select"
				>
					<template #item="{ item, props }">
						<v-list-item v-bind="props" class="language-item">
							<template #prepend>
								<v-icon :color="item.raw.code === currentLanguage ? 'primary' : 'grey'" class="language-icon">
									{{ item.raw.code === currentLanguage ? 'mdi-check-circle' : 'mdi-translate' }}
								</v-icon>
							</template>
							<div class="language-content">
								<v-list-item-title class="language-name">
									{{ item.raw.name }}
									<span class="language-code">({{ item.raw.code.toUpperCase() }})</span>
								</v-list-item-title>
								<v-list-item-subtitle v-if="item.raw.code !== 'en'" class="native-name">
									{{ item.raw.native_name }}
								</v-list-item-subtitle>
							</div>
						</v-list-item>
					</template>
				</v-select>

				<!-- Number Format Selection - Only show for Arabic language -->
				<v-select
					v-if="selectedLanguage === 'ar'"
					v-model="selectedNumberFormat"
					:items="availableNumberFormats"
					item-title="name"
					item-value="code"
					:label="__('Number Format')"
					variant="outlined"
					density="compact"
					:loading="loading"
					:disabled="loading"
					class="mt-3"
				>
					<template #item="{ item, props }">
						<v-list-item v-bind="props">
							<template #prepend>
								<v-icon :color="item.raw.code === currentNumberFormat ? 'primary' : 'grey'">
									{{ item.raw.code === currentNumberFormat ? 'mdi-check-circle' : 'mdi-circle-outline' }}
								</v-icon>
							</template>
							<v-list-item-title>
								{{ __(item.raw.name) }}
							</v-list-item-title>
						</v-list-item>
					</template>
				</v-select>

				<v-alert
					v-if="selectedLanguage !== currentLanguage || (selectedLanguage === 'ar' && selectedNumberFormat !== currentNumberFormat)"
					type="info"
					variant="tonal"
					density="compact"
					class="mt-3"
				>
					{{ __("Settings will be changed to") }}: 
					<strong>{{ selectedLanguageName }}</strong>
					<span v-if="selectedLanguage === 'ar' && selectedNumberFormat !== currentNumberFormat">
						, {{ selectedNumberFormatName }}
					</span>
				</v-alert>
			</v-card-text>

			<v-card-actions class="pa-4 pt-0">
				<v-spacer />
				<v-btn
					color="grey"
					variant="text"
					@click="closeLanguageDialog"
					:disabled="changing"
				>
					{{ __("Cancel") }}
				</v-btn>
				<v-btn
					color="primary"
					:loading="changing"
					:disabled="!canChangeSettings"
					@click="changeLanguage"
				>
					{{ __("Change Settings") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<!-- Notification Snackbars -->
	<v-snackbar
		v-model="notification.show"
		:timeout="notification.timeout"
		:color="notification.type"
		location="top right"
	>
		{{ notification.message }}
		<template #actions>
			<v-btn color="white" variant="text" @click="hideNotification">
				{{ __("Close") }}
			</v-btn>
		</template>
	</v-snackbar>
</template>

<script>
const FALLBACK_LANGUAGES = [
	{ code: "en", name: "English", native_name: "English" },
	{ code: "ar", name: "العربية", native_name: "العربية" },
	{ code: "es", name: "Español", native_name: "Español" },
	{ code: "pt", name: "Português", native_name: "Português" },
];

export default {
	name: "NavbarMenu",
	props: {
		posProfile: { type: Object, default: () => ({}) },
		lastInvoiceId: String,
		manualOffline: Boolean,
		networkOnline: Boolean,
		serverOnline: Boolean,
		isDark: Boolean,
	},
	data() {
		return {
			showLanguageDialog: false,
			selectedLanguage: "en",
			currentLanguage: "en",
			availableLanguages: FALLBACK_LANGUAGES,
			selectedNumberFormat: "western",
			currentNumberFormat: "western",
			loading: false,
			changing: false,
			notification: {
				show: false,
				message: "",
				type: "info",
				timeout: 3000,
			},
		};
	},
	computed: {
		hasPOSProfile() {
			return this.posProfile && Object.keys(this.posProfile).length > 0;
		},
		selectedLanguageName() {
			const lang = this.availableLanguages.find(l => l.code === this.selectedLanguage);
			return lang?.name || this.selectedLanguage.toUpperCase();
		},
		numberFormatNames() {
			return {
				western: this.__('English numerals'),
				arabic: this.__('Arabic numerals')
			};
		},
		selectedNumberFormatName() {
			return this.numberFormatNames[this.selectedNumberFormat] || this.selectedNumberFormat;
		},
		canChangeSettings() {
			return this.hasPOSProfile && 
				(this.selectedLanguage !== this.currentLanguage || 
				(this.selectedLanguage === 'ar' && this.selectedNumberFormat !== this.currentNumberFormat)) && 
				!this.changing;
		},
                availableNumberFormats() {
                        return [
                                { code: 'western', name: this.numberFormatNames.western },
                                { code: 'arabic', name: this.numberFormatNames.arabic }
                        ];
                },
	},
	watch: {
		selectedLanguage(newLang) {
			// Auto-reset number format when switching away from Arabic
			if (newLang !== 'ar') {
				this.selectedNumberFormat = 'western';
			}
		}
	},
	async mounted() {
		try {
			const { waitForFrappe } = await import('../../utils/frappe_loader.js');
			
			await waitForFrappe(async () => {
				console.log('NavbarMenu mounted, starting initialization...');
				await this.initializeLanguage();
				this.setupPOSProfileListener();
			}, {
				timeout: 45000, // Increased timeout for slower connections
				clearCache: true, // Enable automatic cache clearing
				interval: 200 // Slightly longer interval to reduce CPU usage
			});
		} catch (error) {
			console.error('Error during NavbarMenu initialization:', error);
			this.showNotification(
				this.__('Failed to initialize menu. Please try clearing your browser cache or use Ctrl+Shift+R to refresh.'),
				'error',
				8000
			);
		}
	},
	methods: {
		// Core language change functionality
		async changeLanguage() {
			if (!this.canChangeSettings) {
				console.log('Cannot change settings - disabled');
				return;
			}
			
			if (!this.hasPOSProfile) {
				console.log('No POS Profile available');
				this.showNotification(this.__("POS Profile is required to change language settings"), "error");
				return;
			}

			console.log('Starting language change process...');
			console.log('Current settings:', {
				selectedLanguage: this.selectedLanguage,
				posProfile: this.posProfile?.name,
				numberFormat: this.selectedNumberFormat
			});

			this.changing = true;
			try {
				// Use the new set_current_user_language function from utilities.py
				console.log('Calling set_current_user_language with args:', {
					lang_code: this.selectedLanguage,
					pos_profile: this.posProfile?.name,
					number_system: this.selectedLanguage === 'ar' ? (this.selectedNumberFormat === 'arabic' ? 'Arabic' : 'Western') : 'Western'
				});

				const response = await frappe.call({
					method: 'posawesome.posawesome.api.utilities.set_current_user_language',
					args: {
						lang_code: this.selectedLanguage,
						pos_profile: this.posProfile?.name,
						number_system: this.selectedLanguage === 'ar' ? (this.selectedNumberFormat === 'arabic' ? 'Arabic' : 'Western') : 'Western'
					}
				});

				console.log('Got response:', response);

				if (response?.message?.success) {
					console.log('Language change successful, updating settings...');
					
					// Update current settings
					this.currentLanguage = this.selectedLanguage;
					this.currentNumberFormat = this.selectedLanguage === 'ar' ? this.selectedNumberFormat : 'western';
					
					console.log('Updated local settings:', {
						currentLanguage: this.currentLanguage,
						currentNumberFormat: this.currentNumberFormat
					});
					
					// Update global POS Profile object
					if (window.pos_profile) {
						console.log('Updating global POS Profile...');
						window.pos_profile.posa_language = this.currentLanguage;
						window.pos_profile.posa_number_system = this.currentNumberFormat === 'arabic' ? 'Arabic' : 'Western';
					}
					
					// Dispatch event for other components
					console.log('Dispatching number format change event...');
					window.dispatchEvent(new CustomEvent('posawesome_number_format_changed', {
						detail: { 
							language: this.currentLanguage,
							numberFormat: this.currentNumberFormat 
						}
					}));
					
					// Clear translations and refresh
					console.log('Clearing user cache...');
					try {
						await frappe.call({
							method: 'posawesome.posawesome.api.utilities.clear_user_cache'
						});
						console.log('Cache cleared successfully');
					} catch (cacheError) {
						console.error('Error clearing cache:', cacheError);
						frappe.msgprint({
							title: __('Warning'),
							indicator: 'orange',
							message: __('Cache clearing had an error, but settings were saved. You may need to refresh manually.')
						});
					}
					
					this.showNotification("Language and number system updated successfully! Reloading...", "success");
					this.closeLanguageDialog();
					
					// Reload after a short delay
					console.log('Scheduling page reload...');
					setTimeout(() => {
						console.log('Reloading page...');
						window.location.href = window.location.href.split('#')[0];
					}, 2000);
				} else {
					console.error('Language change failed:', response?.message);
					const errorMsg = response?.message?.message || "Failed to update settings";
					this.showNotification(errorMsg, "error");
				}
			} catch (error) {
				console.error("Error changing language:", error);
				console.log('Error details:', {
					message: error.message,
					stack: error.stack,
					response: error.response
				});
				this.showNotification(`Failed to change settings: ${error.message || 'Unknown error'}`, "error");
			} finally {
				console.log('Language change process completed');
				this.changing = false;
			}
		},

		// Initialize language settings
		async initializeLanguage() {
			this.loading = true;
			try {
				await this.loadSettingsFromPOSProfile();
				
				// Get available languages from the utility function
				try {
					const availableLanguagesResponse = await frappe.call({
						method: 'posawesome.posawesome.api.utilities.get_available_languages'
					});

					if (availableLanguagesResponse?.message) {
						this.availableLanguages = availableLanguagesResponse.message;
					} else {
						// Fallback to hardcoded languages
						this.availableLanguages = [
							{ code: 'en', name: 'English', native_name: 'English' },
							{ code: 'ar', name: 'Arabic', native_name: 'العربية' },
							{ code: 'fr', name: 'French', native_name: 'Français' },
							{ code: 'es', name: 'Spanish', native_name: 'Español' },
							{ code: 'de', name: 'German', native_name: 'Deutsch' },
							{ code: 'it', name: 'Italian', native_name: 'Italiano' },
							{ code: 'pt', name: 'Portuguese', native_name: 'Português' },
							{ code: 'ru', name: 'Russian', native_name: 'Русский' },
							{ code: 'zh', name: 'Chinese', native_name: '中文' },
							{ code: 'ja', name: 'Japanese', native_name: '日本語' }
						];
					}
				} catch (error) {
					console.warn("Error getting available languages, using fallback:", error);
					this.availableLanguages = FALLBACK_LANGUAGES;
				}
			} catch (error) {
				console.error("Error initializing language:", error);
				this.availableLanguages = FALLBACK_LANGUAGES;
			} finally {
				this.loading = false;
			}
		},

		// Close language dialog
		closeLanguageDialog() {
			this.showLanguageDialog = false;
			this.selectedLanguage = this.currentLanguage;
			this.selectedNumberFormat = this.currentLanguage === 'ar' ? this.currentNumberFormat : 'western';
		},

		// Load settings from POS Profile
		async loadSettingsFromPOSProfile() {
			try {
				// First try to get user language from the new utility function
				const userLanguageResponse = await frappe.call({
					method: 'posawesome.posawesome.api.utilities.get_current_user_language'
				});

				if (userLanguageResponse?.message?.success) {
					const userData = userLanguageResponse.message;
					this.currentLanguage = userData.language_code;
					this.selectedLanguage = userData.language_code;
				} else {
					// Fallback to system language detection
					const systemLanguage = this.getSystemLanguage();
					this.currentLanguage = systemLanguage;
					this.selectedLanguage = systemLanguage;
				}
				
				// Get POS Profile settings if available
				if (this.posProfile?.name) {
					try {
						const posSettingsResponse = await frappe.call({
							method: 'posawesome.posawesome.api.utilities.get_pos_profile_settings',
							args: {
								pos_profile: this.posProfile?.name
							}
						});

						if (posSettingsResponse?.message?.success) {
							const posData = posSettingsResponse.message;
							const currentLang = posData.current_language || this.currentLanguage;
							
							// Update language if POS Profile has a different setting
							if (currentLang !== this.currentLanguage) {
								this.currentLanguage = currentLang;
								this.selectedLanguage = currentLang;
							}

							// Set number format based on language and POS Profile setting
							if (currentLang === 'ar') {
								const numberSystem = posData.current_number_system || 'Western';
								const numberFormat = numberSystem.toLowerCase() === 'arabic' ? 'arabic' : 'western';
								this.currentNumberFormat = numberFormat;
								this.selectedNumberFormat = numberFormat;
							} else {
								this.currentNumberFormat = 'western';
								this.selectedNumberFormat = 'western';
							}
						} else {
							// Fallback to POS Profile object
							this.setNumberFormatFromPOSProfile();
						}
					} catch (error) {
						console.warn("Error getting POS Profile settings, using fallback:", error);
						this.setNumberFormatFromPOSProfile();
					}
				} else {
					this.currentNumberFormat = 'western';
					this.selectedNumberFormat = 'western';
				}
			} catch (error) {
				console.error("Error loading settings:", error);
				this.currentLanguage = 'en';
				this.selectedLanguage = 'en';
				this.currentNumberFormat = 'western';
				this.selectedNumberFormat = 'western';
			}
		},

		// Fallback method to set number format from POS Profile object
		setNumberFormatFromPOSProfile() {
			if (this.posProfile) {
				if (this.currentLanguage === 'ar') {
					const numberSystem = this.posProfile.posa_number_system || 'Western';
					const numberFormat = numberSystem.toLowerCase() === 'arabic' ? 'arabic' : 'western';
					this.currentNumberFormat = numberFormat;
					this.selectedNumberFormat = numberFormat;
				} else {
					this.currentNumberFormat = 'western';
					this.selectedNumberFormat = 'western';
				}
			} else {
				this.currentNumberFormat = 'western';
				this.selectedNumberFormat = 'western';
			}
		},

		// Open language dialog safely
		openLanguageDialog() {
			try {
				// Reset selections to current values
				this.selectedLanguage = this.currentLanguage;
				this.selectedNumberFormat = this.currentLanguage === 'ar' ? this.currentNumberFormat : 'western';
				this.showLanguageDialog = true;
			} catch (error) {
				console.error("Error opening dialog:", error);
				this.showNotification("Failed to open language dialog", "error");
			}
		},

		// Setup POS Profile listener
		setupPOSProfileListener() {
			if (this.eventBus && this.eventBus.on) {
				this.eventBus.on("pos_profile_changed", async () => {
					await this.loadSettingsFromPOSProfile();
					window.dispatchEvent(new CustomEvent('posawesome_number_format_changed', {
						detail: { 
							language: this.currentLanguage,
							numberFormat: this.currentNumberFormat 
						}
					}));
				});
			}
		},

		// Get system language
		getSystemLanguage() {
			try {
				if (window.frappe?.boot?.user?.language) {
					return window.frappe.boot.user.language;
				}
				if (window.frappe?.boot?.lang) {
					return window.frappe.boot.lang;
				}
				if (document.documentElement.lang) {
					return document.documentElement.lang;
				}
				if (navigator.language) {
					const browserLang = navigator.language.split('-')[0];
					const languageMap = {
						'ar': 'ar', 'en': 'en', 'fr': 'fr', 'es': 'es', 'de': 'de',
						'it': 'it', 'pt': 'pt', 'ru': 'ru', 'zh': 'zh', 'ja': 'ja'
					};
					return languageMap[browserLang] || 'en';
				}
				return 'en';
			} catch (error) {
				console.warn("Error getting system language:", error);
				return 'en';
			}
		},

		// Notification methods
		showNotification(message, type = "info", timeout = 3000) {
			Object.assign(this.notification, {
				show: true,
				message: this.__(message),
				type,
				timeout,
			});
		},

		hideNotification() {
			this.notification.show = false;
		},

		__(text) {
			return window.__ ? window.__(text) : text;
		},
	},
	emits: [
		"close-shift",
		"print-last-invoice", 
		"sync-invoices",
		"toggle-offline",
		"clear-cache",
		"show-about",
		"toggle-theme",
		"logout",
	],
};
</script>

<style scoped>
/* Compact Menu Button - Better Navbar Integration */
.menu-btn-compact {
	margin-left: 8px;
	margin-right: 4px;
	padding: 6px 16px;
	border-radius: 20px;
	font-weight: 600;
	text-transform: none;
	font-size: 13px;
	letter-spacing: 0.3px;
	box-shadow: 0 2px 8px rgba(25, 118, 210, 0.2);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
	min-width: 90px;
	height: 36px;
}

.menu-btn-compact:hover {
	transform: translateY(-1px) scale(1.02);
	box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
	background: linear-gradient(135deg, #1565c0 0%, #1976d2 100%);
}

/* Compact Menu Card - Smaller and Better Positioned */
.menu-card-compact {
	border-radius: 16px;
	overflow: hidden;
	background: #ffffff;
	border: none;
	box-shadow:
		0 8px 24px rgba(0, 0, 0, 0.12),
		0 2px 6px rgba(0, 0, 0, 0.08);
	backdrop-filter: blur(8px);
	min-width: 260px;
	max-width: 280px;
	margin-top: 2px;
}

/* Compact Menu Header */
.menu-header-compact {
	padding: 12px 16px 10px;
	background: linear-gradient(135deg, #f8f9fa 0%, #e3f2fd 100%);
	display: flex;
	align-items: center;
	gap: 10px;
	border-bottom: 1px solid rgba(25, 118, 210, 0.06);
}

.menu-header-text-compact {
	font-size: 14px;
	font-weight: 600;
	color: #1976d2;
	letter-spacing: 0.3px;
}

/* Compact Menu List */
.menu-list-compact {
	padding: 8px 6px 12px;
	background: #ffffff;
}

/* Compact Menu Items */
.menu-item-compact {
	border-radius: 12px;
	margin: 3px 0;
	padding: 12px 16px;
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
	position: relative;
	overflow: hidden;
	min-height: 56px;
	display: flex;
	align-items: center;
	gap: 12px;
}

.menu-item-compact::before {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: transparent;
	transition: all 0.3s ease;
	z-index: 0;
	border-radius: 12px;
}

.menu-item-compact:hover::before {
	background: linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.08) 100%);
}

.menu-item-compact:hover {
	transform: translateX(3px) scale(1.01);
	box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
}

/* Compact Icon Wrapper */
.menu-icon-wrapper-compact {
	width: 32px;
	height: 32px;
	border-radius: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
	position: relative;
	z-index: 1;
	flex-shrink: 0;
}

/* Compact Content Wrapper */
.menu-content-compact {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
	position: relative;
	z-index: 1;
}

/* Compact Icon Colors */
.primary-icon {
	background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
	box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2);
}

.secondary-icon {
	background: linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%);
	box-shadow: 0 2px 6px rgba(123, 31, 162, 0.2);
}

.info-icon {
	background: linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%);
	box-shadow: 0 2px 6px rgba(2, 136, 209, 0.2);
}

.neutral-icon {
	background: linear-gradient(135deg, #616161 0%, #9e9e9e 100%);
	box-shadow: 0 2px 6px rgba(97, 97, 97, 0.2);
}

.danger-icon {
	background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%);
	box-shadow: 0 2px 6px rgba(211, 47, 47, 0.2);
}

.warning-icon {
	background: linear-gradient(135deg, #ff9800 0%, #ffc107 100%);
	box-shadow: 0 2px 6px rgba(255, 152, 0, 0.2);
}

/* Compact Text Styling */
.menu-item-title-compact {
	font-weight: 600;
	font-size: 14px;
	color: #212121;
	line-height: 1.2;
	margin-bottom: 1px;
}

.menu-item-subtitle-compact {
	font-size: 11px;
	color: #666666;
	line-height: 1.3;
	font-weight: 400;
}

/* Compact Section Divider */
.menu-section-divider-compact {
	margin: 8px 10px;
	opacity: 0.12;
	border-color: #1976d2;
}

/* Compact Hover Effects */
.primary-action:hover .primary-icon {
	transform: scale(1.1) rotate(5deg);
	box-shadow: 0 3px 8px rgba(25, 118, 210, 0.25);
}

.secondary-action:hover .secondary-icon {
	transform: scale(1.1) rotate(-5deg);
	box-shadow: 0 3px 8px rgba(123, 31, 162, 0.25);
}

.info-action:hover .info-icon {
	transform: scale(1.1) rotate(360deg);
	box-shadow: 0 3px 8px rgba(2, 136, 209, 0.25);
}

.neutral-action:hover .neutral-icon {
	transform: scale(1.1);
	box-shadow: 0 3px 8px rgba(97, 97, 97, 0.25);
}

.danger-action:hover .danger-icon {
	transform: scale(1.1) rotate(-5deg);
	box-shadow: 0 3px 8px rgba(211, 47, 47, 0.25);
}

.danger-action:hover::before {
	background: linear-gradient(135deg, rgba(211, 47, 47, 0.05) 0%, rgba(244, 67, 54, 0.08) 100%) !important;
}

.warning-action:hover .warning-icon {
	transform: scale(1.1) rotate(-5deg);
	box-shadow: 0 3px 8px rgba(255, 152, 0, 0.25);
}

.warning-action:hover::before {
	background: linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 193, 7, 0.08) 100%) !important;
}

/* Compact Responsive Design */
@media (max-width: 768px) {
	.menu-card-compact {
		min-width: 240px;
		max-width: 260px;
		border-radius: 14px;
	}

	.menu-item-compact {
		padding: 10px 14px;
		min-height: 52px;
		gap: 10px;
	}

	.menu-icon-wrapper-compact {
		width: 30px;
		height: 30px;
	}

	.menu-header-compact {
		padding: 10px 14px 8px;
	}

	.menu-btn-compact {
		margin-left: 6px;
		padding: 5px 14px;
		min-width: 85px;
		height: 34px;
		font-size: 12px;
	}
}

@media (max-width: 480px) {
	.menu-card-compact {
		min-width: 220px;
		max-width: 240px;
	}

	.menu-item-compact {
		padding: 9px 12px;
		min-height: 48px;
		gap: 9px;
	}

	.menu-header-compact {
		padding: 9px 12px 7px;
	}

	.menu-btn-compact {
		min-width: 80px;
		height: 32px;
	}
}

/* Compact Animation for Menu Appearance */
.v-overlay__content {
	animation: menuSlideInCompact 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes menuSlideInCompact {
	from {
		opacity: 0;
		transform: translateY(-8px) scale(0.95);
	}

	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}

/* Compact Focus States */
.menu-item-compact:focus-visible {
	outline: 1px solid #1976d2;
	outline-offset: 1px;
}

.menu-btn-compact:focus-visible {
	outline: 1px solid #1976d2;
	outline-offset: 2px;
}

/* Dark Theme Adjustments */
:deep([data-theme="dark"]) .menu-btn-compact,
:deep(.v-theme--dark) .menu-btn-compact {
	background: linear-gradient(135deg, #90caf9 0%, #42a5f5 100%);
	color: #1e1e1e !important;
}

:deep([data-theme="dark"]) .menu-btn-compact:hover,
:deep(.v-theme--dark) .menu-btn-compact:hover {
	background: linear-gradient(135deg, #64b5f6 0%, #1976d2 100%);
	box-shadow: 0 4px 12px rgba(144, 202, 249, 0.3);
}

:deep([data-theme="dark"]) .menu-card-compact,
:deep(.v-theme--dark) .menu-card-compact {
	background: var(--surface-primary, #1e1e1e) !important;
	border: 1px solid rgba(255, 255, 255, 0.12);
	box-shadow:
		0 8px 24px rgba(0, 0, 0, 0.4),
		0 2px 6px rgba(0, 0, 0, 0.2);
}

:deep([data-theme="dark"]) .menu-header-compact,
:deep(.v-theme--dark) .menu-header-compact {
	background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%) !important;
	border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

:deep([data-theme="dark"]) .menu-header-text-compact,
:deep(.v-theme--dark) .menu-header-text-compact {
	color: var(--primary-light, #90caf9) !important;
}

:deep([data-theme="dark"]) .menu-list-compact,
:deep(.v-theme--dark) .menu-list-compact {
	background: var(--surface-primary, #1e1e1e) !important;
}

:deep([data-theme="dark"]) .menu-item-title-compact,
:deep(.v-theme--dark) .menu-item-title-compact {
	color: var(--text-primary, #ffffff) !important;
}

:deep([data-theme="dark"]) .menu-item-subtitle-compact,
:deep(.v-theme--dark) .menu-item-subtitle-compact {
	color: var(--text-secondary, #b0b0b0) !important;
}

:deep([data-theme="dark"]) .menu-section-divider-compact,
:deep(.v-theme--dark) .menu-section-divider-compact {
	border-color: rgba(255, 255, 255, 0.12) !important;
}

:deep([data-theme="dark"]) .menu-item-compact:hover::before,
:deep(.v-theme--dark) .menu-item-compact:hover::before {
	background: linear-gradient(
		135deg,
		rgba(144, 202, 249, 0.05) 0%,
		rgba(144, 202, 249, 0.08) 100%
	) !important;
}

/* Language Selector Styles */
.language-select {
	margin-bottom: 8px;
}

.language-item {
	padding: 12px 16px;
	transition: all 0.2s ease;
}

.language-item:hover {
	background-color: rgba(25, 118, 210, 0.04);
}

.language-icon {
	margin-right: 12px;
	transition: transform 0.2s ease;
}

.language-item:hover .language-icon {
	transform: scale(1.1);
}

.language-content {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.language-name {
	font-weight: 500;
	font-size: 14px;
	color: var(--text-primary, #212121);
}

.language-code {
	font-size: 12px;
	color: var(--text-secondary, #666666);
	margin-left: 6px;
	font-weight: normal;
}

.native-name {
	font-size: 12px;
	color: var(--text-secondary, #666666);
	font-style: italic;
}

:deep([data-theme="dark"]) .language-name,
:deep(.v-theme--dark) .language-name {
	color: var(--text-primary, #ffffff);
}

:deep([data-theme="dark"]) .language-code,
:deep(.v-theme--dark) .language-code,
:deep([data-theme="dark"]) .native-name,
:deep(.v-theme--dark) .native-name {
	color: var(--text-secondary, #b0b0b0);
}

/* Dark mode icon adjustments */
:deep([data-theme="dark"]) .primary-icon,
:deep(.v-theme--dark) .primary-icon {
	background: linear-gradient(135deg, #90caf9 0%, #42a5f5 100%);
	box-shadow: 0 2px 6px rgba(144, 202, 249, 0.3);
}

:deep([data-theme="dark"]) .secondary-icon,
:deep(.v-theme--dark) .secondary-icon {
	background: linear-gradient(135deg, #ce93d8 0%, #ba68c8 100%);
	box-shadow: 0 2px 6px rgba(206, 147, 216, 0.3);
}

:deep([data-theme="dark"]) .info-icon,
:deep(.v-theme--dark) .info-icon {
	background: linear-gradient(135deg, #81d4fa 0%, #4fc3f7 100%);
	box-shadow: 0 2px 6px rgba(129, 212, 250, 0.3);
}

:deep([data-theme="dark"]) .neutral-icon,
:deep(.v-theme--dark) .neutral-icon {
	background: linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%);
	box-shadow: 0 2px 6px rgba(189, 189, 189, 0.3);
}

:deep([data-theme="dark"]) .danger-icon,
:deep(.v-theme--dark) .danger-icon {
	background: linear-gradient(135deg, #ef5350 0%, #f44336 100%);
	box-shadow: 0 2px 6px rgba(239, 83, 80, 0.3);
}

:deep([data-theme="dark"]) .warning-icon,
:deep(.v-theme--dark) .warning-icon {
	background: linear-gradient(135deg, #ffb74d 0%, #ffc107 100%);
	box-shadow: 0 2px 6px rgba(255, 183, 77, 0.3);
}
</style>

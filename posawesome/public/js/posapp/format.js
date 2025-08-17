// Utility functions for RTL number formatting (standalone)
const formatUtils = {
	// Initialize cache
	_cache: {
		currentLanguage: null,
		numberFormat: null,
		currencySymbols: {},
		lastChecked: null,
		ttl: 5 * 60 * 1000 // 5 minutes TTL
	},
	// Get the current number format preference using utility functions
	async getCurrentNumberFormat() {
		try {
			// Try to get from utility function first
			if (window.frappe && window.frappe.call) {
				try {
					const response = await frappe.call({
						method: 'posawesome.posawesome.api.utilities.get_current_user_language'
					});

					if (response?.message?.success) {
						// Get POS Profile settings if available
						const posProfile = window.pos_profile?.name;
						if (posProfile) {
							const posResponse = await frappe.call({
								method: 'posawesome.posawesome.api.utilities.get_pos_profile_number_system',
								args: [posProfile]
							});

							if (posResponse?.message) {
								return posResponse.message.toLowerCase();
							}
						}
					}
				} catch (error) {
					console.warn("Error getting number format from utilities:", error);
				}
			}

			// Fallback to POS Profile object
			if (window.pos_profile && window.pos_profile.posa_number_system) {
				return window.pos_profile.posa_number_system.toLowerCase();
			}

			// Default fallback
			return 'western';
		} catch (error) {
			console.warn("Error reading number format:", error);
			return 'western';
		}
	},

	// Get current language using utility functions
	async getCurrentLanguage() {
		try {
			// Try to get from utility function first
			if (window.frappe && window.frappe.call) {
				try {
					const response = await frappe.call({
						method: 'posawesome.posawesome.api.utilities.get_current_user_language'
					});

					if (response?.message?.success) {
						return response.message.language_code;
					}
				} catch (error) {
					console.warn("Error getting language from utilities:", error);
				}
			}

			// Fallback to POS Profile object
			if (window.pos_profile && window.pos_profile.posa_language) {
				return window.pos_profile.posa_language;
			}

			// Fallback to system language
			if (window.frappe?.boot?.user?.language) {
				return window.frappe.boot.user.language;
			}

			// Default fallback
			return 'en';
		} catch (error) {
			console.warn("Error reading language:", error);
			return 'en';
		}
	},

	data() {
		return {
			float_precision: 2,
			currency_precision: 2
		};
	},

	// Check if Arabic numerals should be used
	async _initNumberFormat() {
		try {
			const currentLang = await this.getCurrentLanguage();
			const numberFormat = await this.getCurrentNumberFormat();

			this._cache.currentLanguage = currentLang;
			this._cache.numberFormat = numberFormat;
			this._cache.lastChecked = Date.now();

			return {
				isArabic: currentLang?.startsWith('ar') && numberFormat?.toLowerCase() === 'arabic'
			};
		} catch (error) {
			console.warn("Error initializing number format:", error);
			return { isArabic: false };
		}
	},

	// Synchronous check for Arabic numerals using cache
	shouldUseArabicNumerals() {
		try {
			// Use cache if available and not expired
			if (this._cache.lastChecked &&
				(Date.now() - this._cache.lastChecked) < this._cache.ttl) {
				const currentLang = this._cache.currentLanguage;
				const numberFormat = this._cache.numberFormat;

				if (currentLang && numberFormat) {
					return currentLang.startsWith('ar') && numberFormat.toLowerCase() === 'arabic';
				}
			}

			// Default to synchronous check if cache is not available
			return this.shouldUseArabicNumeralsSync();
		} catch (error) {
			console.warn("Error checking Arabic numerals:", error);
			return false;
		}
	},

	// Synchronous version for backward compatibility
	shouldUseArabicNumeralsSync() {
		try {
			// Fallback to direct POS Profile access for synchronous operations
			const currentLang = window.pos_profile?.posa_language || window.frappe?.boot?.user?.language || 'en';
			const numberFormat = window.pos_profile?.posa_number_system;

			if (!currentLang || !numberFormat) {
				return false;
			}

			const isArabicLanguage = currentLang.startsWith('ar');
			const isArabicFormat = (numberFormat || '').toLowerCase() === 'arabic';

			return isArabicLanguage && isArabicFormat;
		} catch (error) {
			console.warn("Error in sync Arabic numerals check:", error);
			return false;
		}
	},

	// Convert Western numerals to Arabic-Indic numerals
	toArabicNumerals(str) {
		if (!this.shouldUseArabicNumerals()) return str;
		const westernToArabic = {
			'0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
			'5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
		};
		return String(str).replace(/[0-9]/g, (match) => westernToArabic[match]);
	},

	// Convert Arabic-Indic numerals back to Western numerals
	fromArabicNumerals(str) {
		const arabicToWestern = {
			'٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
			'٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
		};
		return String(str).replace(/[٠-٩]/g, (match) => arabicToWestern[match]);
	},

	// Parse number input considering current number format
	parseNumberInput(input) {
		if (!input || input.trim() === '') return '0';

		let cleanedInput = String(input).trim();

		// Handle Arabic separators and numerals
		if (this.shouldUseArabicNumerals()) {
			cleanedInput = cleanedInput.replace(/٫/g, '.').replace(/،/g, '');
			cleanedInput = this.fromArabicNumerals(cleanedInput);
		}

		// Remove thousand separators
		return cleanedInput.replace(/,(?=\d{3})/g, '');
	},

	// Add cache clearing method
	clearCache() {
		// Clear any cached values if needed
		this._cachedNumberFormat = null;
		this._cachedLanguage = null;
		this._cachedArabicNumerals = null;
	}
};

// Make formatUtils available globally for other components to access
if (typeof window !== 'undefined') {
	window.formatUtils = formatUtils;
}

export default {
	data() {
		return {
			float_precision: 2,
			currency_precision: 2,
		};
	},
	methods: {
		flt(value, precision, number_format, rounding_method) {
			if (!precision && precision != 0) {
				precision = this.currency_precision || 2;
			}
			if (!rounding_method) {
				rounding_method = "Banker's Rounding (legacy)";
			}
			return flt(value, precision, number_format, rounding_method);
		},

		formatCurrency(value, precision) {
			try {
				if (value === null || value === undefined) value = 0;

				const cleanValue = formatUtils.parseNumberInput(String(value));
				const number = Number(cleanValue) || 0;
				const prec = Math.min(Math.max(Number(precision) || this.currency_precision || 2, 0), 20);

				const useArabic = formatUtils.shouldUseArabicNumerals();
				const locale = useArabic ? 'ar-SA' : 'en-US';
				let formatted = number.toLocaleString(locale, {
					minimumFractionDigits: prec,
					maximumFractionDigits: prec,
					useGrouping: true
				});

				return useArabic ? formatUtils.toArabicNumerals(formatted) : formatted;
			} catch (error) {
				console.error("Error formatting currency:", error);
				return String(value || 0);
			}
		},

		formatFloat(value, precision) {
			try {
				if (value === null || value === undefined) value = 0;

				const cleanValue = formatUtils.parseNumberInput(String(value));
				const number = Number(cleanValue) || 0;
				const prec = Math.min(Math.max(Number(precision) || this.float_precision || 2, 0), 20);

				const useArabic = formatUtils.shouldUseArabicNumerals();
				const locale = useArabic ? 'ar-SA' : 'en-US';
				let formatted = number.toLocaleString(locale, {
					minimumFractionDigits: prec,
					maximumFractionDigits: prec,
					useGrouping: true
				});

				return useArabic ? formatUtils.toArabicNumerals(formatted) : formatted;
			} catch (error) {
				console.error("Error formatting float:", error);
				return String(value || 0);
			}
		},

		// Synchronous versions for backward compatibility
		formatCurrencySync(value, precision) {
			try {
				if (value === null || value === undefined) value = 0;

				const cleanValue = formatUtils.parseNumberInput(String(value));
				const number = Number(cleanValue) || 0;
				const prec = Math.min(Math.max(Number(precision) || this.currency_precision || 2, 0), 20);

				const useArabic = formatUtils.shouldUseArabicNumerals();
				const locale = useArabic ? 'ar-SA' : 'en-US';
				let formatted = number.toLocaleString(locale, {
					minimumFractionDigits: prec,
					maximumFractionDigits: prec,
					useGrouping: true
				});

				return useArabic ? formatUtils.toArabicNumerals(formatted) : formatted;
			} catch (error) {
				console.error("Error formatting currency (sync):", error);
				return String(value || 0);
			}
		},

		formatFloatSync(value, precision) {
			try {
				if (value === null || value === undefined) value = 0;

				const cleanValue = formatUtils.parseNumberInput(String(value));
				const number = Number(cleanValue) || 0;
				const prec = Math.min(Math.max(Number(precision) || this.float_precision || 2, 0), 20);

				const useArabic = formatUtils.shouldUseArabicNumerals();
				const locale = useArabic ? 'ar-SA' : 'en-US';
				let formatted = number.toLocaleString(locale, {
					minimumFractionDigits: prec,
					maximumFractionDigits: prec,
					useGrouping: true
				});

				return useArabic ? formatUtils.toArabicNumerals(formatted) : formatted;
			} catch (error) {
				console.error("Error formatting float (sync):", error);
				return String(value || 0);
			}
		},

		setFormatedCurrency(el, field_name, precision, no_negative = false, $event) {
			const input_val = $event && $event.target ? $event.target.value : $event;
			const cleanValue = formatUtils.parseNumberInput(input_val);
			let value = parseFloat(cleanValue) || 0;

			if (no_negative && value < 0) value = Math.abs(value);

			if (typeof el === "object") {
				el[field_name] = value;
			} else {
				this[field_name] = value;
			}
			return this.formatCurrency(value, precision);
		},

		setFormatedFloat(el, field_name, precision, no_negative = false, $event) {
			const input_val = $event && $event.target ? $event.target.value : $event;
			const cleanValue = formatUtils.parseNumberInput(input_val);
			let value = parseFloat(cleanValue) || 0;

			if (no_negative && value < 0) value = Math.abs(value);

			if (typeof el === "object") {
				el[field_name] = value;
			} else {
				this[field_name] = value;
			}
			return this.formatFloat(value, precision);
		},

		// Initialize or update currency symbols in cache
		async _initCurrencySymbols() {
			try {
				// Get currency symbols from Frappe
				const symbols = {};
				if (window.frappe?.boot?.sysdefaults?.currency_symbols) {
					Object.assign(symbols, window.frappe.boot.sysdefaults.currency_symbols);
				}

				// Add any missing common symbols
				const commonSymbols = {
					'USD': '$',
					'EUR': '€',
					'GBP': '£',
					'JPY': '¥',
					'CNY': '¥',
					'INR': '₹',
					'EGP': 'ج.م',
					'SAR': 'ر.س',
					'AED': 'د.إ'
				};

				for (const [currency, symbol] of Object.entries(commonSymbols)) {
					if (!symbols[currency]) {
						symbols[currency] = symbol;
					}
				}

				this._cache.currencySymbols = symbols;
				this._cache.lastChecked = Date.now();
			} catch (error) {
				console.warn("Error initializing currency symbols:", error);
			}
		},

		// Get currency symbol (synchronous with cache)
		currencySymbol(currency) {
			try {
				if (!currency) return '';

				// Use cached symbols if available
				if (this._cache.currencySymbols[currency]) {
					return this._cache.currencySymbols[currency];
				}

				// Fallback to currency code if symbol not found
				return currency;
			} catch (error) {
				console.warn("Error getting currency symbol:", error);
				return currency || '';
			}
		},

		isNumber(value) {
			if (!value && value !== 0) return "invalid number";
			const cleanValue = formatUtils.parseNumberInput(String(value));
			const pattern = /^-?(\d{1,3}(,\d{3})*|\d+)(\.\d+)?$/;
			return pattern.test(cleanValue) || "invalid number";
		},

		isNegative(value) {
			if (value === null || value === undefined) return false;
			const number = Number(formatUtils.parseNumberInput(String(value)));
			return !isNaN(number) && number < 0;
		},

		// Utility methods
		async getNumberFormat() {
			return await formatUtils.getCurrentNumberFormat();
		},

		async isArabicNumeralsEnabled() {
			return await formatUtils.shouldUseArabicNumerals();
		},

		// Synchronous versions for backward compatibility
		getNumberFormatSync() {
			return formatUtils.shouldUseArabicNumeralsSync() ? 'arabic' : 'western';
		},

		isArabicNumeralsEnabledSync() {
			return formatUtils.shouldUseArabicNumeralsSync();
		},

		parseNumber(value) {
			return formatUtils.parseNumberInput(value);
		},

		validateNumber(value) {
			return this.isNumber(value);
		}
	},
	async mounted() {
		try {
			// Wait for Frappe to be ready
			if (!window.frappe) {
				await new Promise(resolve => {
					const checkFrappe = setInterval(() => {
						if (window.frappe) {
							clearInterval(checkFrappe);
							resolve();
						}
					}, 100);
				});
			}

			// Initialize precision after Frappe is ready
			this.float_precision = (frappe.defaults?.get_default("float_precision") ?? 2);
			this.currency_precision = (frappe.defaults?.get_default("currency_precision") ?? 2);

			// Initialize formatUtils cache
			await formatUtils._initNumberFormat();

			const updatePrecision = (data) => {
				try {
					const profile = data.pos_profile || data;
					const prec = parseInt(profile.posa_decimal_precision);
					if (!isNaN(prec)) {
						this.float_precision = prec;
						this.currency_precision = prec;
					}
					// Update caches when profile changes
					Promise.all([
						formatUtils._initNumberFormat(),
						this._initCurrencySymbols()
					]);
				} catch (error) {
					console.warn('Error updating precision:', error);
				}
			};

			// Listen for POS Profile changes to refresh format settings
			this.refreshFormatSettings = async () => {
				try {
					// Clear any cached format settings
					if (formatUtils.clearCache) {
						formatUtils.clearCache();
					}

					// Dispatch event for other components
					window.dispatchEvent(new CustomEvent('posawesome_format_settings_refreshed'));
				} catch (error) {
					console.warn("Error refreshing format settings:", error);
				}
			};

			if (this.eventBus && this.eventBus.on) {
				this.eventBus.on("register_pos_profile", updatePrecision);
				this.eventBus.on("payments_register_pos_profile", updatePrecision);
				this.eventBus.on("pos_profile_changed", this.refreshFormatSettings);
			}

			// Listen for number format changes from NavbarMenu
			window.addEventListener('posawesome_number_format_changed', this.refreshFormatSettings);
		} catch (error) {
			console.error('Error during format.js initialization:', error);
		}
	},

	beforeUnmount() {
		try {
			if (this.eventBus && this.eventBus.off) {
				this.eventBus.off("register_pos_profile");
				this.eventBus.off("payments_register_pos_profile");
				this.eventBus.off("pos_profile_changed");
			}

			// Remove global event listener
			window.removeEventListener('posawesome_number_format_changed', this.refreshFormatSettings);
		} catch (error) {
			console.error('Error during format.js cleanup:', error);
		}
	}
};
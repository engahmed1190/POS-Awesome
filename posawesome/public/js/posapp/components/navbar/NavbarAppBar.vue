<template>
	<v-app-bar
		app
		flat
		height="56"
		:color="appBarColor"
		:theme="isDark ? 'dark' : 'light'"
		class="navbar-enhanced elevation-2 px-2 pb-1"
	>
		<v-app-bar-nav-icon ref="navIcon" @click="$emit('nav-click')" class="text-secondary nav-icon" />

		<v-img
			src="/assets/posawesome/js/posapp/components/pos/pos.png"
			alt="POS Awesome"
			max-width="32"
			class="mx-2"
		/>

		<v-toolbar-title
			@click="$emit('go-desk')"
			class="text-h6 font-weight-bold text-primary navbar-title"
			style="cursor: pointer; text-decoration: none"
		>
			<span class="font-weight-light">POS</span><span>Awesome</span>
		</v-toolbar-title>

		<v-spacer />

		<!-- Enhanced connectivity status indicator - Always visible -->
		<slot name="status-indicator"></slot>

		<!-- Cache Usage Meter -->
		<slot name="cache-usage-meter"></slot>

		<!-- Database Usage Gadget -->
		<slot name="db-usage-gadget"></slot>

		<!-- CPU Load Gadget -->
		<slot name="cpu-gadget"></slot>

		<div class="profile-section mx-1">
			<v-chip color="primary" variant="outlined" class="profile-chip">
				<v-icon start>mdi-account-circle</v-icon>
				{{ displayName }}
			</v-chip>
		</div>

		<v-btn
			icon
			color="primary"
			class="mx-1 offline-invoices-btn"
			@click="$emit('show-offline-invoices')"
			:class="{ 'has-pending': pendingInvoices > 0 }"
		>
			<v-badge v-if="pendingInvoices > 0" :content="pendingInvoices" color="error" overlap>
				<v-icon>mdi-file-document-multiple-outline</v-icon>
			</v-badge>
			<v-icon v-else>mdi-file-document-multiple-outline</v-icon>
			<v-tooltip activator="parent" location="bottom">
				{{ __("Offline Invoices") }} ({{ pendingInvoices }})
			</v-tooltip>
		</v-btn>

		<!-- Menu component slot -->
		<slot name="menu"></slot>

		<!-- Glass Morphism Loading Bar -->
		<transition name="loading-fade">
			<div v-if="loadingActive" class="loading-container">
				<div class="glass-card">
					<span class="loading-message">{{ loadingMessage }}</span>
					<div class="progress-badge">{{ loadingProgress }}%</div>
				</div>
				<v-progress-linear
					:model-value="loadingProgress"
					color="primary"
					height="4"
					absolute
					location="bottom"
					class="glass-progress"
				/>
			</div>
		</transition>
	</v-app-bar>
</template>

<script>
export default {
	name: "NavbarAppBar",
	props: {
		posProfile: {
			type: Object,
			default: () => ({}),
		},
		pendingInvoices: {
			type: Number,
			default: 0,
		},
		isDark: Boolean,
		loadingProgress: {
			type: Number,
			default: 0,
		},
		loadingActive: {
			type: Boolean,
			default: false,
		},
		loadingMessage: {
			type: String,
			default: 'Loading app data...',
		},
	},
	computed: {
		appBarColor() {
			return this.isDark ? this.$vuetify.theme.themes.dark.colors.surface : "white";
		},

		displayName() {
			// Show POS profile name if available, otherwise show user name
			if (this.posProfile && this.posProfile.name) {
				return this.posProfile.name;
			}

			// Fallback to Frappe user
			if (frappe.session && frappe.session.user_fullname) {
				return frappe.session.user_fullname;
			}

			if (frappe.session && frappe.session.user) {
				return frappe.session.user;
			}

			return "User";
		},
	},

	emits: ["nav-click", "go-desk", "show-offline-invoices"],
};
</script>

<style scoped>
/* Enhanced Navbar Styling */
.navbar-enhanced {
	background-image: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
	background-color: #ffffff !important;
	border-bottom: 2px solid #e3f2fd !important;
	backdrop-filter: blur(10px);
	transition: all 0.3s ease;
	padding-bottom: 4px !important;
}

.navbar-enhanced:hover {
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
}

/* Logo and Brand Styling */
.navbar-title {
	text-decoration: none !important;
	border-bottom: none !important;
}

.navbar-title:hover {
	text-decoration: none !important;
}

/* Navigation Icon */
.nav-icon {
	border-radius: 12px;
	padding: 6px;
	transition: all 0.3s ease;
}

.nav-icon:hover {
	background-color: rgba(25, 118, 210, 0.1);
	transform: scale(1.1);
}

/* Profile Section */
.profile-section {
	margin: 0 8px;
}

.profile-chip {
	font-weight: 500;
	padding: 6px 12px;
	border-radius: 20px;
	transition: all 0.3s ease;
}

.profile-chip:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

/* Offline Invoices Button Enhancement */
.offline-invoices-btn {
	position: relative;
	transition: all 0.3s ease;
	padding: 4px;
}

.offline-invoices-btn:hover {
	transform: scale(1.05);
}

.offline-invoices-btn.has-pending {
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0% {
		box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.4);
	}
	70% {
		box-shadow: 0 0 0 10px rgba(244, 67, 54, 0);
	}
	100% {
		box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
	}
}

/* Dark theme adjustments */
:deep([data-theme="dark"]) .navbar-enhanced,
:deep(.v-theme--dark) .navbar-enhanced {
	background-image: linear-gradient(
		135deg,
		var(--surface-primary, #1e1e1e) 0%,
		var(--surface-secondary, #2d2d2d) 100%
	) !important;
	background-color: var(--surface-primary, #1e1e1e) !important;
	border-bottom: 2px solid var(--border-color, rgba(255, 255, 255, 0.12)) !important;
	color: var(--text-primary, #ffffff) !important;
}

:deep([data-theme="dark"]) .navbar-enhanced:hover,
:deep(.v-theme--dark) .navbar-enhanced:hover {
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
}

:deep([data-theme="dark"]) .nav-icon,
:deep(.v-theme--dark) .nav-icon {
	color: var(--text-primary, #ffffff) !important;
}

:deep([data-theme="dark"]) .nav-icon:hover,
:deep(.v-theme--dark) .nav-icon:hover {
	background-color: rgba(144, 202, 249, 0.1);
}

:deep([data-theme="dark"]) .navbar-title,
:deep(.v-theme--dark) .navbar-title {
	color: var(--text-primary, #ffffff) !important;
}

:deep([data-theme="dark"]) .profile-chip,
:deep(.v-theme--dark) .profile-chip {
	background-color: var(--surface-secondary, #2d2d2d) !important;
	color: var(--text-primary, #ffffff) !important;
	border-color: var(--primary-light, #90caf9) !important;
}

/* ===== GLASS MORPHISM LOADING BAR ===== */
.loading-container {
	position: absolute;
	bottom: 0;
        inset-inline-start: 0;
        inset-inline-end: 0;
	z-index: 1000;
}

.glass-card {
	position: absolute;
	top: -40px;
        inset-inline-start: 12px;
        inset-inline-end: 12px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8px 16px;
	
	/* Glass morphism effect */
	background: color(from Canvas r g b / 0.8);
	backdrop-filter: blur(20px);
	border-radius: 12px;
	border: 1px solid color(from Canvas r g b / 0.1);
	
	/* System shadows */
	box-shadow: 
		0 8px 32px color(from CanvasText r g b / 0.1),
		0 1px 0 color(from Canvas r g b / 0.5) inset;
}

.loading-message {
	font-size: 12px;
	font-weight: 500;
	color: AccentColor;
	flex: 1;
}

.progress-badge {
	font-size: 11px;
	font-weight: 600;
	color: Canvas;
	background: AccentColor;
	padding: 2px 8px;
	border-radius: 8px;
	min-width: 32px;
	text-align: center;
}

.glass-progress {
	border-radius: 0 !important;
	backdrop-filter: blur(10px);
}

.glass-progress :deep(.v-progress-linear__background) {
	background: color(from CanvasText r g b / 0.1) !important;
}

.glass-progress :deep(.v-progress-linear__determinate) {
	background: AccentColor !important;
	box-shadow: 0 0 12px color(from AccentColor r g b / 0.3);
}

/* Smooth transitions */
.loading-fade-enter-active,
.loading-fade-leave-active {
	transition: all 0.3s ease;
}

.loading-fade-enter-from {
	opacity: 0;
	transform: translateY(8px);
}

.loading-fade-leave-to {
	opacity: 0;
	transform: translateY(-4px);
}

/* Dark theme fallback for older browsers */
@media (prefers-color-scheme: dark) {
	.glass-card {
		background: rgba(30, 30, 30, 0.8);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 
			0 8px 32px rgba(0, 0, 0, 0.2),
			0 1px 0 rgba(255, 255, 255, 0.1) inset;
	}
	
	.loading-message {
		color: #bb86fc;
	}
	
	.progress-badge {
		background: #bb86fc;
		color: #000;
	}
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.glass-card {
		padding: 6px 12px;
		left: 8px;
		right: 8px;
	}
	
	.loading-message {
		font-size: 11px;
	}
	
	.progress-badge {
		font-size: 10px;
		padding: 1px 6px;
		min-width: 28px;
	}
}
</style>

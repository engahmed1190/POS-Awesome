export default {
  data() {
    return {
      windowWidth: 0,
      windowHeight: 0,
      devicePixelRatio: 1,
      orientation: 'portrait',
      isTouch: false,
      headerElement: null,
      footerElement: null,
      actualHeaderHeight: 0,
      actualFooterHeight: 0
    };
  },

  computed: {
    // Enhanced device detection
    deviceType() {
      if (this.windowWidth < 576) return 'mobile';
      if (this.windowWidth < 768) return 'mobile-large';
      if (this.windowWidth < 992) return 'tablet';
      if (this.windowWidth < 1200) return 'desktop';
      if (this.windowWidth < 1400) return 'desktop-large';
      return 'desktop-xl';
    },

    // Dynamic aspect ratio calculation
    aspectRatio() {
      return this.windowWidth / this.windowHeight;
    },

    // Enhanced scaling factors
    widthScale() {
      const baseWidth = 1920;
      return Math.min(Math.max(this.windowWidth / baseWidth, 0.5), 2);
    },

    heightScale() {
      const baseHeight = 1080;
      return Math.min(Math.max(this.windowHeight / baseHeight, 0.5), 2);
    },

    // Intelligent scale factor
    intelligentScale() {
      const avgScale = (this.widthScale + this.heightScale) / 2;
      const densityFactor = this.devicePixelRatio > 1 ? 0.9 : 1;
      return avgScale * densityFactor;
    },

    // Dynamic spacing based on device and scale
    dynamicSpacing() {
      const baseSpacing = {
        mobile: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 },
        tablet: { xs: 4, sm: 6, md: 12, lg: 18, xl: 24 },
        desktop: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
      };
      
      const deviceSpacing = baseSpacing[this.deviceType.includes('mobile') ? 'mobile' : 
                                       this.deviceType.includes('tablet') ? 'tablet' : 'desktop'];
      
      return {
        xs: Math.round(deviceSpacing.xs * this.intelligentScale),
        sm: Math.round(deviceSpacing.sm * this.intelligentScale),
        md: Math.round(deviceSpacing.md * this.intelligentScale),
        lg: Math.round(deviceSpacing.lg * this.intelligentScale),
        xl: Math.round(deviceSpacing.xl * this.intelligentScale)
      };
    },

    // Dynamic header/footer heights with real measurements
    dynamicHeaderHeight() {
      if (this.actualHeaderHeight > 0) {
        return this.actualHeaderHeight + (this.dynamicSpacing.sm * 2);
      }
      
      // Fallback calculation based on device type and orientation
      const basePercentages = {
        'mobile': this.orientation === 'landscape' ? 0.15 : 0.12,
        'mobile-large': this.orientation === 'landscape' ? 0.13 : 0.11,
        'tablet': this.orientation === 'landscape' ? 0.10 : 0.09,
        'desktop': 0.08,
        'desktop-large': 0.07,
        'desktop-xl': 0.06
      };
      
      const percentage = basePercentages[this.deviceType] || 0.08;
      return Math.max(60, Math.round(this.windowHeight * percentage));
    },

    dynamicFooterHeight() {
      if (this.actualFooterHeight > 0) {
        return this.actualFooterHeight + (this.dynamicSpacing.sm * 2);
      }
      
      const basePercentages = {
        'mobile': this.orientation === 'landscape' ? 0.12 : 0.10,
        'mobile-large': this.orientation === 'landscape' ? 0.10 : 0.09,
        'tablet': this.orientation === 'landscape' ? 0.08 : 0.07,
        'desktop': 0.06,
        'desktop-large': 0.05,
        'desktop-xl': 0.04
      };
      
      const percentage = basePercentages[this.deviceType] || 0.06;
      return Math.max(50, Math.round(this.windowHeight * percentage));
    },

    // Maximum available space calculation
    availableHeight() {
      const usedHeight = this.dynamicHeaderHeight + this.dynamicFooterHeight;
      const safetyMargin = this.dynamicSpacing.md;
      return Math.max(200, this.windowHeight - usedHeight - safetyMargin);
    },

    // Dynamic grid calculations
    itemsPerRow() {
      const itemMinWidth = this.deviceType.includes('mobile') ? 140 : 160;
      const containerPadding = this.dynamicSpacing.md * 2;
      const itemSpacing = this.dynamicSpacing.sm;
      
      const availableWidth = this.windowWidth - containerPadding;
      const itemsWithSpacing = Math.floor(availableWidth / (itemMinWidth + itemSpacing));
      
      // Ensure minimum 2 items per row, maximum based on device
      const maxItems = {
        'mobile': 2,
        'mobile-large': 3,
        'tablet': 4,
        'desktop': 6,
        'desktop-large': 8,
        'desktop-xl': 10
      };
      
      return Math.min(Math.max(2, itemsWithSpacing), maxItems[this.deviceType] || 6);
    },

    // Dynamic item dimensions
    dynamicItemWidth() {
      const containerPadding = this.dynamicSpacing.md * 2;
      const totalSpacing = (this.itemsPerRow - 1) * this.dynamicSpacing.sm;
      const availableWidth = this.windowWidth - containerPadding - totalSpacing;
      return Math.floor(availableWidth / this.itemsPerRow);
    },

    dynamicItemHeight() {
      // Calculate optimal height based on available space and aspect ratio
      const baseHeight = this.deviceType.includes('mobile') ? 120 : 140;
      const scaledHeight = Math.round(baseHeight * this.intelligentScale);
      
      // Ensure items fit well in available space
      const maxRowsVisible = Math.floor(this.availableHeight / (scaledHeight + this.dynamicSpacing.sm));
      if (maxRowsVisible < 3) {
        // If less than 3 rows visible, reduce item height
        return Math.round(this.availableHeight / 3.5);
      }
      
      return scaledHeight;
    },

    // Enhanced responsive styles
    responsiveStyles() {
      return {
        // Spacing variables
        '--dynamic-xs': `${this.dynamicSpacing.xs}px`,
        '--dynamic-sm': `${this.dynamicSpacing.sm}px`,
        '--dynamic-md': `${this.dynamicSpacing.md}px`,
        '--dynamic-lg': `${this.dynamicSpacing.lg}px`,
        '--dynamic-xl': `${this.dynamicSpacing.xl}px`,
        
        // Layout variables
        '--header-height': `${this.dynamicHeaderHeight}px`,
        '--footer-height': `${this.dynamicFooterHeight}px`,
        '--available-height': `${this.availableHeight}px`,
        '--container-height': `${this.availableHeight}px`,
        '--card-height': `${this.availableHeight}px`,
        
        // Item variables
        '--items-per-row': this.itemsPerRow,
        '--item-width': `${this.dynamicItemWidth}px`,
        '--item-height': `${this.dynamicItemHeight}px`,
        '--item-min-height': `${Math.round(this.dynamicItemHeight * 0.8)}px`,
        '--item-max-height': `${Math.round(this.dynamicItemHeight * 1.2)}px`,
        
        // Responsive scaling
        '--font-scale': this.intelligentScale.toFixed(3),
        '--width-scale': this.widthScale.toFixed(3),
        '--height-scale': this.heightScale.toFixed(3),
        '--device-pixel-ratio': this.devicePixelRatio,
        
        // Device context
        '--device-type': `"${this.deviceType}"`,
        '--orientation': `"${this.orientation}"`,
        '--aspect-ratio': this.aspectRatio.toFixed(3),
        
        // Advanced layout
        '--scroll-height': `${this.availableHeight - this.dynamicSpacing.lg}px`,
        '--grid-gap': `${this.dynamicSpacing.sm}px`,
        '--border-radius': `${Math.round(4 * this.intelligentScale)}px`,
        '--shadow-blur': `${Math.round(8 * this.intelligentScale)}px`,
        
        // Touch optimizations
        '--touch-target-size': this.isTouch ? '44px' : '32px',
        '--hover-scale': this.isTouch ? '1' : '1.02'
      };
    }
  },

  mounted() {
    this.initializeResponsive();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationChange);
    this.measureElements();
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
  },

  methods: {
    initializeResponsive() {
      this.devicePixelRatio = window.devicePixelRatio || 1;
      this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.updateOrientation();
    },

    handleResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.updateOrientation();
      
      // Debounced element measurement
      clearTimeout(this.measureTimeout);
      this.measureTimeout = setTimeout(() => {
        this.measureElements();
      }, 100);
    },

    handleOrientationChange() {
      setTimeout(() => {
        this.handleResize();
      }, 100);
    },

    updateOrientation() {
      this.orientation = this.windowWidth > this.windowHeight ? 'landscape' : 'portrait';
    },

    measureElements() {
      // Measure actual header and footer heights
      this.$nextTick(() => {
        const headerSelectors = [
          '.v-app-bar',
          '.v-toolbar',
          '[data-header]',
          '.header',
          '.pos-header'
        ];
        
        const footerSelectors = [
          '.v-bottom-navigation',
          '.v-footer',
          '[data-footer]',
          '.footer',
          '.pos-footer'
        ];
        
        for (const selector of headerSelectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetHeight > 0) {
            this.actualHeaderHeight = element.offsetHeight;
            break;
          }
        }
        
        for (const selector of footerSelectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetHeight > 0) {
            this.actualFooterHeight = element.offsetHeight;
            break;
          }
        }
      });
    },

    // Utility method for components to get optimal item count
    getOptimalItemCount() {
      const itemHeight = this.dynamicItemHeight + this.dynamicSpacing.sm;
      const visibleRows = Math.floor(this.availableHeight / itemHeight);
      return visibleRows * this.itemsPerRow;
    },

    // Method to recalculate on demand
    recalculateLayout() {
      this.handleResize();
      this.measureElements();
    }
  }
};

// Export the mixin
export const responsiveMixin = {
  data() {
    return {
      windowWidth: 0,
      windowHeight: 0,
      devicePixelRatio: 1,
      orientation: 'portrait',
      isTouch: false,
      headerElement: null,
      footerElement: null,
      actualHeaderHeight: 0,
      actualFooterHeight: 0
    };
  },

  computed: {
    // Enhanced device detection
    deviceType() {
      if (this.windowWidth < 576) return 'mobile';
      if (this.windowWidth < 768) return 'mobile-large';
      if (this.windowWidth < 992) return 'tablet';
      if (this.windowWidth < 1200) return 'desktop';
      if (this.windowWidth < 1400) return 'desktop-large';
      return 'desktop-xl';
    },

    // Dynamic aspect ratio calculation
    aspectRatio() {
      return this.windowWidth / this.windowHeight;
    },

    // Enhanced scaling factors
    widthScale() {
      const baseWidth = 1920;
      return Math.min(Math.max(this.windowWidth / baseWidth, 0.5), 2);
    },

    heightScale() {
      const baseHeight = 1080;
      return Math.min(Math.max(this.windowHeight / baseHeight, 0.5), 2);
    },

    // Intelligent scale factor
    intelligentScale() {
      const avgScale = (this.widthScale + this.heightScale) / 2;
      const densityFactor = this.devicePixelRatio > 1 ? 0.9 : 1;
      return avgScale * densityFactor;
    },

    // Dynamic spacing based on device and scale
    dynamicSpacing() {
      const baseSpacing = {
        mobile: { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 },
        tablet: { xs: 4, sm: 6, md: 12, lg: 18, xl: 24 },
        desktop: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
      };
      
      const deviceSpacing = baseSpacing[this.deviceType.includes('mobile') ? 'mobile' : 
                                       this.deviceType.includes('tablet') ? 'tablet' : 'desktop'];
      
      return {
        xs: Math.round(deviceSpacing.xs * this.intelligentScale),
        sm: Math.round(deviceSpacing.sm * this.intelligentScale),
        md: Math.round(deviceSpacing.md * this.intelligentScale),
        lg: Math.round(deviceSpacing.lg * this.intelligentScale),
        xl: Math.round(deviceSpacing.xl * this.intelligentScale)
      };
    },

    // Dynamic header/footer heights with real measurements
    dynamicHeaderHeight() {
      if (this.actualHeaderHeight > 0) {
        return this.actualHeaderHeight + (this.dynamicSpacing.sm * 2);
      }
      
      // Fallback calculation based on device type and orientation
      const basePercentages = {
        'mobile': this.orientation === 'landscape' ? 0.15 : 0.12,
        'mobile-large': this.orientation === 'landscape' ? 0.13 : 0.11,
        'tablet': this.orientation === 'landscape' ? 0.10 : 0.09,
        'desktop': 0.08,
        'desktop-large': 0.07,
        'desktop-xl': 0.06
      };
      
      const percentage = basePercentages[this.deviceType] || 0.08;
      return Math.max(60, Math.round(this.windowHeight * percentage));
    },

    dynamicFooterHeight() {
      if (this.actualFooterHeight > 0) {
        return this.actualFooterHeight + (this.dynamicSpacing.sm * 2);
      }
      
      const basePercentages = {
        'mobile': this.orientation === 'landscape' ? 0.12 : 0.10,
        'mobile-large': this.orientation === 'landscape' ? 0.10 : 0.09,
        'tablet': this.orientation === 'landscape' ? 0.08 : 0.07,
        'desktop': 0.06,
        'desktop-large': 0.05,
        'desktop-xl': 0.04
      };
      
      const percentage = basePercentages[this.deviceType] || 0.06;
      return Math.max(50, Math.round(this.windowHeight * percentage));
    },

    // Maximum available space calculation
    availableHeight() {
      const usedHeight = this.dynamicHeaderHeight + this.dynamicFooterHeight;
      const safetyMargin = this.dynamicSpacing.md;
      return Math.max(200, this.windowHeight - usedHeight - safetyMargin);
    },

    // Dynamic grid calculations
    itemsPerRow() {
      const itemMinWidth = this.deviceType.includes('mobile') ? 140 : 160;
      const containerPadding = this.dynamicSpacing.md * 2;
      const itemSpacing = this.dynamicSpacing.sm;
      
      const availableWidth = this.windowWidth - containerPadding;
      const itemsWithSpacing = Math.floor(availableWidth / (itemMinWidth + itemSpacing));
      
      // Ensure minimum 2 items per row, maximum based on device
      const maxItems = {
        'mobile': 2,
        'mobile-large': 3,
        'tablet': 4,
        'desktop': 6,
        'desktop-large': 8,
        'desktop-xl': 10
      };
      
      return Math.min(Math.max(2, itemsWithSpacing), maxItems[this.deviceType] || 6);
    },

    // Dynamic item dimensions
    dynamicItemWidth() {
      const containerPadding = this.dynamicSpacing.md * 2;
      const totalSpacing = (this.itemsPerRow - 1) * this.dynamicSpacing.sm;
      const availableWidth = this.windowWidth - containerPadding - totalSpacing;
      return Math.floor(availableWidth / this.itemsPerRow);
    },

    dynamicItemHeight() {
      // Calculate optimal height based on available space and aspect ratio
      const baseHeight = this.deviceType.includes('mobile') ? 120 : 140;
      const scaledHeight = Math.round(baseHeight * this.intelligentScale);
      
      // Ensure items fit well in available space
      const maxRowsVisible = Math.floor(this.availableHeight / (scaledHeight + this.dynamicSpacing.sm));
      if (maxRowsVisible < 3) {
        // If less than 3 rows visible, reduce item height
        return Math.round(this.availableHeight / 3.5);
      }
      
      return scaledHeight;
    },

    // Enhanced responsive styles
    responsiveStyles() {
      return {
        // Spacing variables
        '--dynamic-xs': `${this.dynamicSpacing.xs}px`,
        '--dynamic-sm': `${this.dynamicSpacing.sm}px`,
        '--dynamic-md': `${this.dynamicSpacing.md}px`,
        '--dynamic-lg': `${this.dynamicSpacing.lg}px`,
        '--dynamic-xl': `${this.dynamicSpacing.xl}px`,
        
        // Layout variables
        '--header-height': `${this.dynamicHeaderHeight}px`,
        '--footer-height': `${this.dynamicFooterHeight}px`,
        '--available-height': `${this.availableHeight}px`,
        '--container-height': `${this.availableHeight}px`,
        '--card-height': `${this.availableHeight}px`,
        
        // Item variables
        '--items-per-row': this.itemsPerRow,
        '--item-width': `${this.dynamicItemWidth}px`,
        '--item-height': `${this.dynamicItemHeight}px`,
        '--item-min-height': `${Math.round(this.dynamicItemHeight * 0.8)}px`,
        '--item-max-height': `${Math.round(this.dynamicItemHeight * 1.2)}px`,
        
        // Responsive scaling
        '--font-scale': this.intelligentScale.toFixed(3),
        '--width-scale': this.widthScale.toFixed(3),
        '--height-scale': this.heightScale.toFixed(3),
        '--device-pixel-ratio': this.devicePixelRatio,
        
        // Device context
        '--device-type': `"${this.deviceType}"`,
        '--orientation': `"${this.orientation}"`,
        '--aspect-ratio': this.aspectRatio.toFixed(3),
        
        // Advanced layout
        '--scroll-height': `${this.availableHeight - this.dynamicSpacing.lg}px`,
        '--grid-gap': `${this.dynamicSpacing.sm}px`,
        '--border-radius': `${Math.round(4 * this.intelligentScale)}px`,
        '--shadow-blur': `${Math.round(8 * this.intelligentScale)}px`,
        
        // Touch optimizations
        '--touch-target-size': this.isTouch ? '44px' : '32px',
        '--hover-scale': this.isTouch ? '1' : '1.02'
      };
    }
  },

  mounted() {
    this.initializeResponsive();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationChange);
    this.measureElements();
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
  },

  methods: {
    initializeResponsive() {
      this.devicePixelRatio = window.devicePixelRatio || 1;
      this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.updateOrientation();
    },

    handleResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.updateOrientation();
      
      // Debounced element measurement
      clearTimeout(this.measureTimeout);
      this.measureTimeout = setTimeout(() => {
        this.measureElements();
      }, 100);
    },

    handleOrientationChange() {
      setTimeout(() => {
        this.handleResize();
      }, 100);
    },

    updateOrientation() {
      this.orientation = this.windowWidth > this.windowHeight ? 'landscape' : 'portrait';
    },

    measureElements() {
      // Measure actual header and footer heights
      this.$nextTick(() => {
        const headerSelectors = [
          '.v-app-bar',
          '.v-toolbar',
          '[data-header]',
          '.header',
          '.pos-header'
        ];
        
        const footerSelectors = [
          '.v-bottom-navigation',
          '.v-footer',
          '[data-footer]',
          '.footer',
          '.pos-footer'
        ];
        
        for (const selector of headerSelectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetHeight > 0) {
            this.actualHeaderHeight = element.offsetHeight;
            break;
          }
        }
        
        for (const selector of footerSelectors) {
          const element = document.querySelector(selector);
          if (element && element.offsetHeight > 0) {
            this.actualFooterHeight = element.offsetHeight;
            break;
          }
        }
      });
    },

    // Utility method for components to get optimal item count
    getOptimalItemCount() {
      const itemHeight = this.dynamicItemHeight + this.dynamicSpacing.sm;
      const visibleRows = Math.floor(this.availableHeight / itemHeight);
      return visibleRows * this.itemsPerRow;
    },

    // Method to recalculate on demand
    recalculateLayout() {
      this.handleResize();
      this.measureElements();
    }
  }
};
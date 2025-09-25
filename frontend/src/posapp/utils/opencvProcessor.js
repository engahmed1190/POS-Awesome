import opencvWorkerManager from './opencvWorkerManager.js';

class OpenCVProcessor {
    constructor() {
        this.initialized = false;
        this.initPromise = null;
        this.workerManager = opencvWorkerManager;
        this.lastQualityAssessment = null;
    }

    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        try {
            await this.workerManager.initialize();
            this.initialized = true;
            console.log('OpenCV Processor with Web Worker initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize OpenCV Processor:', error);
            this.initialized = false;
            return false;
        }
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
        return this.initialized;
    }

    /**
     * Optimized preprocessing for fast and accurate real-time scanning using Web Worker
     */
    async quickProcess(imageData) {
        if (!await this.ensureInitialized()) {
            console.warn('OpenCV Worker not initialized, skipping processing');
            return imageData;
        }

        try {
            const processedImageData = await this.workerManager.processImage(imageData, {
                useGaussianBlur: false, // Skip for speed
                useAdaptiveThreshold: true,
                useMorphological: true,
                useUnsharpMask: true,
                useCLAHE: false, // Skip for speed
                useDeblur: false, // Skip for speed
                useNoiseReduction: false, // Skip for speed
                useEdgeEnhancement: false, // Skip for speed
                qualityLevel: 'medium'
            });

            return processedImageData;
        } catch (error) {
            console.error('Error in OpenCV worker processing:', error);
            return imageData; // Return original on error
        }
    }

    /**
     * Full preprocessing pipeline for difficult barcodes using Web Worker
     */
    async fullProcess(imageData) {
        if (!await this.ensureInitialized()) {
            console.warn('OpenCV Worker not initialized, skipping processing');
            return imageData;
        }

        try {
            // Use enhanced processing with all advanced algorithms
            const processedImageData = await this.workerManager.processImage(imageData, {
                useGaussianBlur: false, // Skip basic blur in favor of advanced algorithms
                useAdaptiveThreshold: true,
                useMorphological: true,
                useUnsharpMask: true,
                useCLAHE: true,
                useDeblur: true,
                useNoiseReduction: true,
                useEdgeEnhancement: true,
                qualityLevel: 'high'
            });

            return processedImageData;
        } catch (error) {
            console.error('Error in OpenCV worker processing:', error);
            return imageData; // Return original on error
        }
    }

    /**
     * Extreme processing for very poor quality images
     */
    async extremeProcess(imageData) {
        if (!await this.ensureInitialized()) {
            console.warn('OpenCV Worker not initialized, skipping processing');
            return imageData;
        }

        try {
            console.log('Applying extreme processing for very poor quality image');
            const processedImageData = await this.workerManager.processImageExtreme(imageData);
            return processedImageData;
        } catch (error) {
            console.error('Error in extreme OpenCV worker processing:', error);
            return imageData; // Return original on error
        }
    }

    /**
     * Intelligent processing that automatically detects quality level
     */
    async intelligentProcess(imageData) {
        if (!await this.ensureInitialized()) {
            console.warn('OpenCV Worker not initialized, skipping processing');
            return imageData;
        }

        try {
            // Simple quality assessment - check for low contrast/blur
            const quality = this.assessImageQuality(imageData);
            this.lastQualityAssessment = quality;

            console.log('Image quality assessment:', quality);

            if (quality.level === 'very_poor') {
                console.log('Using extreme processing for very poor quality image');
                return await this.extremeProcess(imageData);
            } else if (quality.level === 'poor') {
                console.log('Using full processing for poor quality image');
                return await this.fullProcess(imageData);
            } else {
                console.log('Using quick processing for acceptable quality image');
                return await this.quickProcess(imageData);
            }
        } catch (error) {
            console.error('Error in intelligent OpenCV processing:', error);
            return imageData;
        }
    }

    /**
     * Simple image quality assessment
     */
    assessImageQuality(imageData) {
        const { data, width, height } = imageData;

        // Calculate basic statistics
        let sum = 0;
        let sumSquares = 0;
        let edgePixels = 0;

        // Sample pixels (every 4th pixel for performance)
        const sampleRate = 4;
        let samples = 0;

        for (let i = 0; i < data.length; i += 4 * sampleRate) {
            // Convert to grayscale
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            sum += gray;
            sumSquares += gray * gray;
            samples++;

            // Simple edge detection (check difference with neighboring pixels)
            if (i + 4 * width < data.length) {
                const neighborGray = data[i + 4 * width] * 0.299 + data[i + 4 * width + 1] * 0.587 + data[i + 4 * width + 2] * 0.114;
                if (Math.abs(gray - neighborGray) > 30) {
                    edgePixels++;
                }
            }
        }

        const mean = sum / samples;
        const variance = (sumSquares / samples) - (mean * mean);
        const contrast = Math.sqrt(variance) / 255; // Normalized contrast
        const edgeRatio = edgePixels / samples;

        // Quality assessment
        let level = 'good';
        if (contrast < 0.15 && edgeRatio < 0.05) {
            level = 'very_poor';
        } else if (contrast < 0.25 && edgeRatio < 0.1) {
            level = 'poor';
        } else if (contrast < 0.35) {
            level = 'fair';
        }

        return {
            level,
            contrast: contrast.toFixed(3),
            edgeRatio: edgeRatio.toFixed(3),
            mean: mean.toFixed(1),
            recommendation: level === 'very_poor' ? 'Use extreme processing' :
                           level === 'poor' ? 'Use full processing' : 'Use quick processing'
        };
    }

    /**
     * Clean up resources
     */
    async destroy() {
        this.initialized = false;
        try {
            await this.workerManager.destroy();
        } catch (error) {
            console.warn('Error destroying OpenCV worker:', error);
        }
    }
}

// Create singleton instance
const opencvProcessor = new OpenCVProcessor();
export default opencvProcessor;
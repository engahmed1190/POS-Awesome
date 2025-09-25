// OpenCV Web Worker for non-blocking image processing
let cv = null;
let initialized = false;

// Load OpenCV.js from local bundle
async function initializeOpenCV() {
    if (initialized && cv) {
        return cv;
    }

    try {
        // Load OpenCV.js from local bundle
        importScripts('/assets/posawesome/libs/opencv.js');

        // Wait for OpenCV to be ready
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('OpenCV initialization timeout'));
            }, 30000); // 30 second timeout

            const checkCV = () => {
                if (typeof cv !== 'undefined' && cv && cv.Mat) {
                    clearTimeout(timeout);
                    initialized = true;
                    console.log('OpenCV.js initialized in Web Worker from local bundle');
                    resolve(cv);
                } else if (typeof self.cv !== 'undefined' && self.cv && self.cv.Mat) {
                    cv = self.cv;
                    clearTimeout(timeout);
                    initialized = true;
                    console.log('OpenCV.js initialized in Web Worker from local bundle (global)');
                    resolve(cv);
                } else {
                    setTimeout(checkCV, 100);
                }
            };
            checkCV();
        });
    } catch (error) {
        console.error('Failed to load OpenCV.js from local bundle:', error);
        throw error;
    }
}

// Convert ImageData to OpenCV Mat
function imageDataToMat(imageData) {
    if (!cv) return null;

    const mat = new cv.Mat(imageData.height, imageData.width, cv.CV_8UC4);
    mat.data.set(imageData.data);
    return mat;
}

// Convert OpenCV Mat to ImageData
function matToImageData(mat) {
    if (!cv) return null;

    return new ImageData(
        new Uint8ClampedArray(mat.data),
        mat.cols,
        mat.rows
    );
}

// Extreme quality enhancement for very poor images
async function processVeryPoorImage(imageData) {
    if (!initialized || !cv) {
        throw new Error('OpenCV not initialized');
    }

    let src = imageDataToMat(imageData);
    let processed = src.clone();

    try {
        console.log('Applying extreme quality enhancement for very poor image');

        // Convert to LAB color space for better processing
        if (processed.channels() > 1) {
            const lab = new cv.Mat();
            const labChannels = new cv.MatVector();
            cv.cvtColor(processed, lab, cv.COLOR_RGBA2LAB);
            cv.split(lab, labChannels);
            processed.delete();
            processed = labChannels.get(0).clone();
            lab.delete();
            for (let i = 0; i < labChannels.size(); i++) {
                labChannels.get(i).delete();
            }
            labChannels.delete();
        }

        // Step 1: Extreme CLAHE for very poor contrast
        const clahe = cv.createCLAHE(5.0, new cv.Size(4, 4));
        const enhanced = new cv.Mat();
        clahe.apply(processed, enhanced);
        clahe.delete();
        processed.delete();
        processed = enhanced;

        // Step 2: Heavy noise reduction
        const denoised = new cv.Mat();
        cv.fastNlMeansDenoising(processed, denoised, 15, 7, 21);
        processed.delete();
        processed = denoised;

        // Step 3: Aggressive deblurring
        const deblurred = new cv.Mat();
        const sharpKernel = new cv.Mat();
        const sharpData = [
            0, -1, 0,
            -1, 8, -1,
            0, -1, 0
        ];
        sharpKernel.create(3, 3, cv.CV_32FC1);
        sharpKernel.data32F.set(sharpData);
        cv.filter2D(processed, deblurred, cv.CV_8UC1, sharpKernel);
        sharpKernel.delete();
        processed.delete();
        processed = deblurred;

        // Step 4: Multi-pass unsharp masking
        for (let pass = 0; pass < 2; pass++) {
            const blurred = new cv.Mat();
            const mask = new cv.Mat();
            const sharpened = new cv.Mat();

            cv.bilateralFilter(processed, blurred, 9, 80, 80);
            cv.subtract(processed, blurred, mask);
            cv.addWeighted(processed, 1.0 + 3.0, mask, -3.0, 0, sharpened);

            blurred.delete();
            mask.delete();
            processed.delete();
            processed = sharpened;
        }

        // Step 5: Triple adaptive thresholding
        const thresh1 = new cv.Mat();
        const thresh2 = new cv.Mat();
        const thresh3 = new cv.Mat();
        const combined = new cv.Mat();
        const final = new cv.Mat();

        cv.adaptiveThreshold(processed, thresh1, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 12);
        cv.adaptiveThreshold(processed, thresh2, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 31, 15);
        cv.adaptiveThreshold(processed, thresh3, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 15, 8);

        cv.bitwise_and(thresh1, thresh2, combined);
        cv.bitwise_and(combined, thresh3, final);

        thresh1.delete();
        thresh2.delete();
        thresh3.delete();
        combined.delete();
        processed.delete();
        processed = final;

        // Step 6: Advanced barcode-specific morphology
        const temp1 = new cv.Mat();
        const temp2 = new cv.Mat();
        const morphed = new cv.Mat();

        // Extra wide horizontal kernel for barcode enhancement
        const hKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(15, 1));
        cv.morphologyEx(processed, temp1, cv.MORPH_CLOSE, hKernel, new cv.Point(-1, -1), 2);

        // Remove small vertical artifacts
        const vKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 5));
        cv.morphologyEx(temp1, temp2, cv.MORPH_OPEN, vKernel, new cv.Point(-1, -1), 1);

        // Final cleanup
        const cleanKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        cv.morphologyEx(temp2, morphed, cv.MORPH_CLOSE, cleanKernel, new cv.Point(-1, -1), 2);

        hKernel.delete();
        vKernel.delete();
        cleanKernel.delete();
        temp1.delete();
        temp2.delete();
        processed.delete();
        processed = morphed;

        // Convert back to RGBA
        const rgba = new cv.Mat();
        cv.cvtColor(processed, rgba, cv.COLOR_GRAY2RGBA);
        const resultImageData = matToImageData(rgba);

        // Cleanup
        src.delete();
        processed.delete();
        rgba.delete();

        return resultImageData;

    } catch (error) {
        console.error('Error in extreme quality processing:', error);
        if (src) src.delete();
        if (processed) processed.delete();
        throw error;
    }
}

// Advanced processing pipeline for poor quality images
async function processImageData(imageData, options = {}) {
    if (!initialized || !cv) {
        throw new Error('OpenCV not initialized');
    }

    const {
        useAdaptiveThreshold = true,
        useMorphological = true,
        useUnsharpMask = true,
        useCLAHE = true,
        useDeblur = true,
        useNoiseReduction = true,
        useEdgeEnhancement = true,
        qualityLevel = 'high' // 'low', 'medium', 'high'
    } = options;

    let src = imageDataToMat(imageData);
    let processed = src.clone();

    console.log('Processing image with advanced algorithms for poor quality:', {
        width: imageData.width,
        height: imageData.height,
        qualityLevel
    });

    try {
        // Convert to grayscale with better color space conversion
        if (processed.channels() > 1) {
            const gray = new cv.Mat();
            const lab = new cv.Mat();
            const labChannels = new cv.MatVector();

            // Convert to LAB color space first for better luminance extraction
            cv.cvtColor(processed, lab, cv.COLOR_RGBA2LAB);
            cv.split(lab, labChannels);

            // Use L channel (luminance) which preserves contrast better
            gray.delete();
            processed.delete();
            processed = labChannels.get(0).clone();

            // Cleanup
            lab.delete();
            for (let i = 0; i < labChannels.size(); i++) {
                labChannels.get(i).delete();
            }
            labChannels.delete();
        }

        // Step 1: Advanced noise reduction for poor quality images
        if (useNoiseReduction) {
            const denoised = new cv.Mat();
            // Use Non-local Means Denoising - excellent for noisy/poor quality images
            cv.fastNlMeansDenoising(processed, denoised, 10, 7, 21);
            processed.delete();
            processed = denoised;
        }

        // Step 1.5: CLAHE (Contrast Limited Adaptive Histogram Equalization)
        if (useCLAHE) {
            const clahe = cv.createCLAHE(3.0, new cv.Size(8, 8));
            const enhanced = new cv.Mat();
            clahe.apply(processed, enhanced);
            clahe.delete();
            processed.delete();
            processed = enhanced;
        }

        // Step 2: Advanced deblurring for blurry images
        if (useDeblur && qualityLevel === 'high') {
            const deblurred = new cv.Mat();
            const kernel = new cv.Mat();

            // Create a deblurring kernel (Laplacian-based)
            const kernelData = [
                0, -1, 0,
                -1, 5, -1,
                0, -1, 0
            ];
            kernel.create(3, 3, cv.CV_32FC1);
            kernel.data32F.set(kernelData);

            cv.filter2D(processed, deblurred, cv.CV_8UC1, kernel);
            kernel.delete();
            processed.delete();
            processed = deblurred;
        }

        // Step 2.5: Advanced unsharp masking with better parameters for poor quality
        if (useUnsharpMask) {
            const blurredForMask = new cv.Mat();
            const mask = new cv.Mat();
            const sharpened = new cv.Mat();

            // Use bilateral filter instead of Gaussian for edge-preserving blur
            cv.bilateralFilter(processed, blurredForMask, 9, 75, 75);

            // Create unsharp mask
            cv.subtract(processed, blurredForMask, mask);

            // Apply stronger unsharp masking for poor quality images
            const amount = qualityLevel === 'high' ? 2.5 : 1.8;
            cv.addWeighted(processed, 1.0 + amount, mask, -amount, 0, sharpened);

            blurredForMask.delete();
            mask.delete();
            processed.delete();
            processed = sharpened;
        }

        // Step 3: Multi-level adaptive thresholding for poor quality
        if (useAdaptiveThreshold) {
            const thresholded1 = new cv.Mat();
            const thresholded2 = new cv.Mat();
            const combined = new cv.Mat();

            // First pass: Fine details
            cv.adaptiveThreshold(
                processed,
                thresholded1,
                255,
                cv.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv.THRESH_BINARY,
                15, // larger block size for poor quality
                8   // higher C constant
            );

            // Second pass: Coarser details
            cv.adaptiveThreshold(
                processed,
                thresholded2,
                255,
                cv.ADAPTIVE_THRESH_MEAN_C,
                cv.THRESH_BINARY,
                25, // even larger block size
                12  // higher C constant
            );

            // Combine both thresholds using bitwise AND for better results
            cv.bitwise_and(thresholded1, thresholded2, combined);

            thresholded1.delete();
            thresholded2.delete();
            processed.delete();
            processed = combined;
        }

        // Step 4: Advanced morphological operations for barcode cleanup
        if (useMorphological) {
            const temp1 = new cv.Mat();
            const temp2 = new cv.Mat();
            const morphed = new cv.Mat();

            // Horizontal kernel for barcode enhancement
            const horizontalKernel = cv.getStructuringElement(
                cv.MORPH_RECT,
                new cv.Size(9, 1)
            );

            // Vertical kernel for noise removal
            const verticalKernel = cv.getStructuringElement(
                cv.MORPH_RECT,
                new cv.Size(1, 3)
            );

            // Close horizontal gaps (typical for barcodes)
            cv.morphologyEx(processed, temp1, cv.MORPH_CLOSE, horizontalKernel, new cv.Point(-1, -1), 1);

            // Remove vertical noise
            cv.morphologyEx(temp1, temp2, cv.MORPH_OPEN, verticalKernel, new cv.Point(-1, -1), 1);

            // Final cleanup with rectangular kernel
            const cleanupKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
            cv.morphologyEx(temp2, morphed, cv.MORPH_CLOSE, cleanupKernel, new cv.Point(-1, -1), 1);

            horizontalKernel.delete();
            verticalKernel.delete();
            cleanupKernel.delete();
            temp1.delete();
            temp2.delete();
            processed.delete();
            processed = morphed;
        }

        // Step 5: Final edge enhancement for barcode detection
        if (useEdgeEnhancement) {
            const edges = new cv.Mat();
            const enhanced = new cv.Mat();

            // Apply Sobel edge detection
            const sobelX = new cv.Mat();
            const sobelY = new cv.Mat();
            cv.Sobel(processed, sobelX, cv.CV_8U, 1, 0, 3);
            cv.Sobel(processed, sobelY, cv.CV_8U, 0, 1, 3);

            // Combine both directions
            cv.addWeighted(sobelX, 0.7, sobelY, 0.3, 0, edges);

            // Enhance the original with edge information
            cv.addWeighted(processed, 0.8, edges, 0.2, 0, enhanced);

            sobelX.delete();
            sobelY.delete();
            edges.delete();
            processed.delete();
            processed = enhanced;
        }

        // Convert back to RGBA
        const rgba = new cv.Mat();
        cv.cvtColor(processed, rgba, cv.COLOR_GRAY2RGBA);

        const resultImageData = matToImageData(rgba);

        // Cleanup
        src.delete();
        processed.delete();
        rgba.delete();

        return resultImageData;

    } catch (error) {
        console.error('Error in OpenCV worker processing:', error);
        // Cleanup on error
        if (src) src.delete();
        if (processed) processed.delete();
        throw error;
    }
}

// Handle messages from main thread
self.onmessage = async function(e) {
    const { id, type, data } = e.data;

    try {
        switch (type) {
            case 'INIT':
                await initializeOpenCV();
                self.postMessage({ id, type: 'INIT_SUCCESS' });
                break;

            case 'PROCESS':
                const { imageData, options } = data;
                // Auto-detect quality level if not specified
                const enhancedOptions = {
                    qualityLevel: 'high', // Default to aggressive processing for poor quality
                    useCLAHE: true,
                    useDeblur: true,
                    useNoiseReduction: true,
                    useEdgeEnhancement: true,
                    ...options
                };
                const processedImageData = await processImageData(imageData, enhancedOptions);
                self.postMessage({
                    id,
                    type: 'PROCESS_SUCCESS',
                    data: processedImageData
                });
                break;

            case 'PROCESS_EXTREME':
                // Use extreme processing for very poor quality images
                const { imageData: extremeImageData } = data;
                const extremeProcessedData = await processVeryPoorImage(extremeImageData);
                self.postMessage({
                    id,
                    type: 'PROCESS_SUCCESS',
                    data: extremeProcessedData
                });
                break;

            case 'CLEANUP':
                // Cleanup any remaining resources
                initialized = false;
                cv = null;
                self.postMessage({ id, type: 'CLEANUP_SUCCESS' });
                break;

            default:
                throw new Error(`Unknown message type: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            id,
            type: 'ERROR',
            error: error.message
        });
    }
};
import axios from 'axios';

// Create axios instance with FastAPI backend
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
    }
});

// ==================== Health & Status ====================

/**
 * Check API health status
 */
export const checkHealth = () => api.get('/health');

/**
 * Get validation statistics
 */
export const getStats = () => api.get('/stats');

// ==================== Single Provider Validation ====================

/**
 * Validate a single provider
 * @param {Object} providerData - Provider information
 */
export const validateProvider = (providerData) =>
    api.post('/validate', providerData);

/**
 * Validate multiple providers in batch
 * @param {Object} batchRequest - Batch validation request
 */
export const validateBatch = (batchRequest) =>
    api.post('/validate/batch', batchRequest);

/**
 * Get batch validation status
 * @param {string} batchId - Batch job ID
 */
export const getBatchStatus = (batchId) =>
    api.get(`/batch/${batchId}`);

// ==================== File Upload ====================

/**
 * Upload provider list file (PDF or Excel)
 * @param {File} file - File to upload

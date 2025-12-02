import React, { useState } from 'react';
import { Upload, Play, CheckCircle, AlertTriangle, FileText, Loader, Phone, MessageSquare, Download, X, Users } from 'lucide-react';
import { uploadFile, validateUploadedFile, getBatchStatus } from '../services/api';

const Validation = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [validating, setValidating] = useState(false);
    const [validationResults, setValidationResults] = useState(null);
    const [error, setError] = useState(null);
    const [batchId, setBatchId] = useState(null);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const response = await uploadFile(file);

            if (response.data.extraction_status === 'success') {
                setUploadResult(response.data);
            } else {
                setError(response.data.extraction_status || 'Failed to extract providers from file');
            }
        } catch (err) {
            console.error("Upload failed", err);
            setError(err.response?.data?.error || err.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleValidate = async () => {
        if (!uploadResult || !uploadResult.file_id) {
            setError('No file uploaded');
            return;
        }

        setValidating(true);
        setError(null);

        try {
            // Start batch validation
            const response = await validateUploadedFile(uploadResult.file_id);
            const newBatchId = response.data.batch_id;
            setBatchId(newBatchId);

            // Poll for results
            let attempts = 0;
            const maxAttempts = 60; // 60 seconds max

            const pollResults = setInterval(async () => {
                attempts++;

                try {
                    const statusResponse = await getBatchStatus(newBatchId);
                    const batch = statusResponse.data;

                    if (batch.status === 'COMPLETED') {
                        clearInterval(pollResults);
                        setValidationResults(batch);
                        // Save results to localStorage for Directory page
                        if (batch.results && batch.results.length > 0) {
                            localStorage.setItem('validationResults', JSON.stringify(batch.results));
                        }
                        setValidating(false);
                    } else if (batch.status === 'FAILED' || attempts >= maxAttempts) {
                        clearInterval(pollResults);
                        setError('Validation failed or timed out');
                        setValidating(false);
                    }
                } catch (err) {

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
                    console.error('Error polling batch status:', err);
                }
            }, 1000);

        } catch (err) {
            console.error("Validation failed", err);
            setError(err.response?.data?.error || err.message || 'Failed to start validation');
            setValidating(false);
        }
    };

    const handleCallAll = () => {
        if (!validationResults || !validationResults.results) return;

        const phoneNumbers = validationResults.results
            .filter(r => r.verified_phone)
            .map(r => r.verified_phone);

        alert(`Initiating calls to ${phoneNumbers.length} providers:\n${phoneNumbers.join('\n')}`);
        // In production, this would integrate with a calling service
    };

    const handleSMSAll = () => {
        if (!validationResults || !validationResults.results) return;

        const phoneNumbers = validationResults.results
            .filter(r => r.verified_phone)
            .map(r => r.verified_phone);

        alert(`Sending SMS to ${phoneNumbers.length} providers:\n${phoneNumbers.join('\n')}`);
        // In production, this would integrate with an SMS service
    };

    const handleReset = () => {
        setFile(null);
        setUploadResult(null);
        setValidationResults(null);
        setError(null);
        setBatchId(null);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'VERIFIED': return 'text-green-400 bg-green-500/20 border-green-500/30';
            case 'PARTIALLY_VERIFIED': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
            case 'UNVERIFIED': return 'text-red-400 bg-red-500/20 border-red-500/30';
            case 'FLAGGED': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
            default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center space-y-4">
                <h1 className="text-5xl font-poster text-white">Batch Provider Validation</h1>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                    Upload a PDF or Excel file with provider names. Our AI will validate them against multiple data sources and provide confidence scores.
                </p>
            </div>

            {/* Upload Section */}
            {!uploadResult && !validationResults && (
                <div className="glass-panel p-8 rounded-2xl border border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-6">Upload Provider List</h2>

                    <div className="space-y-6">
                        <div className="border-2 border-dashed border-white/20 rounded-xl p-12 text-center hover:border-primary/50 transition-colors">
                            <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                            <p className="text-lg text-white mb-2">Drop your file here or click to browse</p>
                            <p className="text-sm text-slate-400 mb-4">Supports PDF and Excel (.xlsx) files</p>
                            <input
                                type="file"
                                accept=".pdf,.xlsx,.xls"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="inline-block px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl cursor-pointer transition-colors text-white font-medium"
                            >
                                Select File
                            </label>
                        </div>

                        {file && (

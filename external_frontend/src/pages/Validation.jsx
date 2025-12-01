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

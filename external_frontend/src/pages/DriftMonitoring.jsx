import React, { useState } from 'react';
import axios from 'axios';
import { AlertCircle, TrendingUp, Clock, Shield, Activity } from 'lucide-react';

const DriftMonitoring = () => {
    const [providerName, setProviderName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const monitorDrift = async () => {
        if (!providerName.trim()) {
            setError('Please enter a provider name');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);


        try {
            const response = await axios.post(`http://localhost:8000/drift-monitor?provider_name=${encodeURIComponent(providerName)}`);
            console.log('Full API Response:', response);
            console.log('Response Data:', response.data);
            console.log('Result Data:', response.data.data);
            setResult(response.data.data);
        } catch (err) {
            console.error('Error:', err);
            console.error('Error Response:', err.response);
            setError(err.response?.data?.detail || 'Failed to monitor drift. Please try again.');
        } finally {
            setLoading(false);
        }
    };


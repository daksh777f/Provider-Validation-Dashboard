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

    const getRiskColor = (score) => {
        if (score >= 50) return 'text-red-500';
        if (score >= 30) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getRiskBgColor = (score) => {
        if (score >= 50) return 'bg-red-500/10 border-red-500/30';
        if (score >= 30) return 'bg-yellow-500/10 border-yellow-500/30';
        return 'bg-green-500/10 border-green-500/30';
    };

    const getRiskLabel = (score) => {
        if (score >= 50) return 'HIGH RISK';
        if (score >= 30) return 'MEDIUM RISK';
        return 'LOW RISK';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 backdrop-blur-md border border-purple-500/20 rounded-2xl p-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                        <Activity className="w-8 h-8 text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                            Credential Drift Monitoring
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Detect changes in provider credentials over time
                        </p>
                    </div>
                </div>
            </div>

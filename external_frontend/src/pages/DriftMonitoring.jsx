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

            {/* Search Box */}
            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-700/50 rounded-2xl p-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={providerName}
                        onChange={(e) => setProviderName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && monitorDrift()}
                        placeholder="Enter provider name (e.g., Dr Shalini Rao)"
                        className="flex-1 px-6 py-4 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                    <button
                        onClick={monitorDrift}
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-semibold hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Analyzing...
                            </div>
                        ) : (
                            'Monitor Drift'
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                        <div className="text-red-400">{error}</div>
                    </div>
                )}
            </div>


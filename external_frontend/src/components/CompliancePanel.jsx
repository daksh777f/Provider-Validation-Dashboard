import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

export default function CompliancePanel({ providerId, providerData }) {
    const [compliance, setCompliance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (providerId) {
            fetchCompliance();
        }
    }, [providerId]);

    const fetchCompliance = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching compliance for provider:', providerId);

            const response = await fetch(`http://localhost:8000/compliance/check/${providerId}`);
            console.log('Response status:', response.status);

            const data = await response.json();
            console.log('Compliance data received:', data);

            if (data.success && data.data) {
                setCompliance(data.data);
            } else {
                console.error('Compliance response not successful:', data);
                setError('Failed to load compliance data');
            }
        } catch (err) {
            console.error('Compliance fetch error:', err);
            setError('Failed to load compliance data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const recalculate = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Recalculating compliance for provider:', providerId);

            // Prepare provider data for compliance calculation
            const requestData = providerData ? {
                id: providerId,
                full_name: providerData.name || providerData.provider_name || 'Unknown',
                first_name: providerData.first_name || '',
                last_name: providerData.last_name || '',
                npi: providerData.npi || '',
                license: providerData.license_number || providerData.license || '',
                board_certified: providerData.board_certified || false,
                updated_at: providerData.updated_at || new Date().toISOString()
            } : { id: providerId };

            console.log('Sending request data:', requestData);

            const response = await fetch(`http://localhost:8000/compliance/recalculate/${providerId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            console.log('Recalculate response status:', response.status);
            const data = await response.json();
            console.log('Recalculate response:', data);

            if (data.success && data.data) {
                setCompliance(data.data);
                console.log('Compliance updated:', data.data);
            } else {
                const errorMsg = data.error || 'Failed to recalculate compliance';
                console.error('Recalculate error:', errorMsg);
                setError(errorMsg);
            }
        } catch (err) {
            console.error('Recalculate exception:', err);
            setError('Failed to recalculate compliance: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-900 rounded-lg shadow-lg p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-900 rounded-lg shadow-lg p-6">
                <div className="flex items-center text-red-400">
                    <XCircle className="w-5 h-5 mr-2" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (!compliance) {
        return null;
    }

    const getRiskColor = (color) => {
        const colors = {
            green: 'bg-green-900/30 text-green-300 border-green-700 shadow-green-500/20',
            yellow: 'bg-yellow-900/30 text-yellow-300 border-yellow-700 shadow-yellow-500/20',
            orange: 'bg-orange-900/30 text-orange-300 border-orange-700 shadow-orange-500/20',
            red: 'bg-red-900/30 text-red-300 border-red-700 shadow-red-500/20',
            gray: 'bg-gray-800 text-gray-300 border-gray-700'
        };
        return colors[color] || colors.gray;
    };

    // Show initial calculation prompt if not calculated
    if (compliance.risk_level === 'UNKNOWN' || !compliance.calculated_at) {
        return (
            <div className="bg-gray-900 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between border-b border-gray-700 pb-4 mb-4">
                    <div className="flex items-center">
                        <Shield className="w-6 h-6 mr-2 text-blue-400" />
                        <h2 className="text-2xl font-bold text-white">Compliance Intelligence</h2>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <Shield className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-gray-200 mb-2">
                        Compliance Status Not Calculated
                    </h3>
                    <p className="text-gray-400 mb-6">
                        Run compliance analysis to check this provider against sanction registries and calculate their Compliance Risk Index (CRI).
                    </p>
                    <button
                        onClick={recalculate}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-lg"
                    >
                        Calculate Compliance Status
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-700 pb-4">
                <div className="flex items-center">
                    <Shield className="w-6 h-6 mr-2 text-blue-400" />
                    <h2 className="text-2xl font-bold text-white">Compliance Intelligence</h2>
                </div>
                <button
                    onClick={recalculate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg font-semibold"
                >
                    Recalculate
                </button>
            </div>

import React, { useState, useEffect } from 'react';
import { Phone, Mail, Filter, Download } from 'lucide-react';

const BulkOutreach = () => {
    const [providers, setProviders] = useState([]);
    const [filteredProviders, setFilteredProviders] = useState([]);
    const [confidenceThreshold, setConfidenceThreshold] = useState(85);
    const [loading, setLoading] = useState(true);
    const [selectedProviders, setSelectedProviders] = useState([]);

    useEffect(() => {
        fetchProviders();
    }, []);

    useEffect(() => {
        // Filter providers based on confidence threshold
        const filtered = providers.filter(
            p => p.confidence_scores?.overall_confidence * 100 < confidenceThreshold
        );
        setFilteredProviders(filtered);
        setSelectedProviders(filtered.map(p => p.provider_id));
    }, [confidenceThreshold, providers]);

    const fetchProviders = async () => {
        try {
            setLoading(true);
            // Get validated providers from localStorage (same as Directory page)
            const storedResults = localStorage.getItem('validationResults');

            if (!storedResults) {
                setProviders([]);
                setLoading(false);
                return;
            }

            const results = JSON.parse(storedResults);

            // Map validation results to provider format
            const providersList = results.map(result => ({
                provider_id: result.provider_id,
                provider_name: result.provider_name,
                verified_phone: result.verified_phone,
                verified_address: result.verified_address,
                confidence_scores: result.confidence_scores,
                validation_status: result.validation_status,
                issues: result.issues || []
            }));

            setProviders(providersList);
        } catch (error) {
            console.error('Error fetching providers:', error);
            setProviders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedProviders.length === filteredProviders.length) {
            setSelectedProviders([]);
        } else {
            setSelectedProviders(filteredProviders.map(p => p.provider_id));
        }
    };

    const handleSelectProvider = (providerId) => {
        setSelectedProviders(prev =>
            prev.includes(providerId)
                ? prev.filter(id => id !== providerId)
                : [...prev, providerId]
        );
    };

    const handleBulkSMS = () => {
        const selectedPhones = filteredProviders
            .filter(p => selectedProviders.includes(p.provider_id))
            .map(p => p.verified_phone)
            .filter(Boolean);

        alert(`Would send SMS to ${selectedPhones.length} providers:\n${selectedPhones.join(', ')}`);
    };

    const handleBulkCall = () => {
        const selectedPhones = filteredProviders
            .filter(p => selectedProviders.includes(p.provider_id))
            .map(p => p.verified_phone)
            .filter(Boolean);

        alert(`Would initiate calls to ${selectedPhones.length} providers:\n${selectedPhones.join(', ')}`);
    };

    const exportToCSV = () => {
        const selectedData = filteredProviders.filter(p => selectedProviders.includes(p.provider_id));
        const csv = [
            ['Name', 'Phone', 'Confidence', 'Status', 'Issues'].join(','),
            ...selectedData.map(p => [
                p.provider_name,
                p.verified_phone || 'N/A',
                `${(p.confidence_scores?.overall_confidence * 100).toFixed(0)}%`,
                p.validation_status,
                p.issues?.length || 0
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `low-confidence-providers-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center text-slate-400">Loading providers...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-poster text-white mb-2">Bulk Outreach</h1>
                <p className="text-slate-400">Contact providers with low confidence scores</p>
            </div>

            {/* Controls */}
            <div className="glass-panel p-6 rounded-2xl space-y-6">
                {/* Threshold Slider */}
                <div>
                    <label className="flex items-center gap-2 text-white mb-3">
                        <Filter size={18} className="text-primary" />
                        <span className="font-semibold">Confidence Threshold: &lt; {confidenceThreshold}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleSelectAll}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all"
                    >

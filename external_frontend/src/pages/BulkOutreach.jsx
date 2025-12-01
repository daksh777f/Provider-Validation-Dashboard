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

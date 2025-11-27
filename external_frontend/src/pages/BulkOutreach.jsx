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

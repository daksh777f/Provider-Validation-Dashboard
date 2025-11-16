import React, { useState, useEffect } from 'react';
import { Check, X, AlertOctagon, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReviewQueue = () => {
    const [reviews, setReviews] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            // Get validated providers from localStorage
            const storedResults = localStorage.getItem('validationResults');

            if (!storedResults) {
                setReviews([]);
                return;
            }

            const results = JSON.parse(storedResults);

            // Filter only FLAGGED or providers requiring manual review
            const flaggedProviders = results
                .filter(result =>
                    result.validation_status === 'FLAGGED' ||
                    result.requires_manual_review === true ||
                    (result.issues && result.issues.some(issue => issue.severity === 'HIGH' || issue.severity === 'CRITICAL'))
                )
                .map(result => ({
                    id: result.provider_id,
                    name: result.provider_name,
                    specialty: result.verified_specialty || 'Unknown',
                    issues: result.issues?.map(i => i.issue) || ['Requires review'],
                    phone: result.verified_phone || 'N/A',
                    confidenceScore: Math.round((result.confidence_scores?.overall_confidence || 0) * 100)
                }));

            setReviews(flaggedProviders);
        } catch (error) {
            console.error("Error fetching reviews", error);
            setReviews([]);
        }
    };

    const handleReview = async (id, action) => {
        try {
            // Simulate review action
            await new Promise(resolve => setTimeout(resolve, 500));
            setReviews(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Review failed", error);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-poster text-white">Manual Review Queue</h1>

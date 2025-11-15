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

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

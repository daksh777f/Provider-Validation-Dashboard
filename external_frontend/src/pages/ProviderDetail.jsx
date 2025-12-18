import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, CheckCircle, AlertTriangle, Clock, Shield, Send, MessageSquare, PhoneCall } from 'lucide-react';
import gsap from 'gsap';
import { startVerification, getVerificationStatus, getProviderVerifications } from '../services/api';
import CompliancePanel from '../components/CompliancePanel';

const ProviderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    // Persistent state with localStorage
    const [provider, setProvider] = useState(() => {
        const cached = sessionStorage.getItem(`provider_${id}`);
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(true);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationHistory, setVerificationHistory] = useState(() => {
        const cached = sessionStorage.getItem(`verification_history_${id}`);
        return cached ? JSON.parse(cached) : [];
    });
    const [currentSession, setCurrentSession] = useState(() => {
        const cached = sessionStorage.getItem(`current_session_${id}`);
        return cached ? JSON.parse(cached) : null;
    });

    useEffect(() => {
        fetchProvider();
        fetchVerificationHistory();
    }, [id]);

    const fetchVerificationHistory = async () => {
        try {
            const response = await getProviderVerifications(id);
            setVerificationHistory(response.data.sessions || []);
        } catch (error) {
            console.error('Error fetching verification history:', error);
        }
    };

    const [conversation, setConversation] = useState(() => {
        const cached = sessionStorage.getItem(`conversation_${id}`);
        return cached ? JSON.parse(cached) : [];
    });

    // Call verification data from Omni Dimension webhook
    const [callVerification, setCallVerification] = useState(() => {
        const cached = sessionStorage.getItem(`call_verification_${id}`);
        return cached ? JSON.parse(cached) : null;
    });
    const [callLoading, setCallLoading] = useState(false);
    const [callPollingEnabled, setCallPollingEnabled] = useState(false);

    // Fetch call verification data - only when polling is enabled
    useEffect(() => {
        if (!callPollingEnabled) return;

        const fetchCallData = async () => {
            if (!id) return;

            try {
                setCallLoading(true);
                const response = await axios.get(`http://localhost:8000/verify/call-data/${id}`);

                if (response.data.success && response.data.call_verification) {
                    setCallVerification(response.data.call_verification);
                }
            } catch (error) {
                console.error('Error fetching call verification:', error);
            } finally {
                setCallLoading(false);
            }
        };

        fetchCallData();
        // Poll for updates every 10 seconds
        const interval = setInterval(fetchCallData, 10000);
        return () => clearInterval(interval);
    }, [id, callPollingEnabled]);

    // Save state to sessionStorage when it changes
    useEffect(() => {
        if (provider) sessionStorage.setItem(`provider_${id}`, JSON.stringify(provider));
    }, [provider, id]);

    useEffect(() => {
        sessionStorage.setItem(`verification_history_${id}`, JSON.stringify(verificationHistory));
    }, [verificationHistory, id]);

    useEffect(() => {
        if (currentSession) sessionStorage.setItem(`current_session_${id}`, JSON.stringify(currentSession));
    }, [currentSession, id]);

    useEffect(() => {
        sessionStorage.setItem(`conversation_${id}`, JSON.stringify(conversation));
    }, [conversation, id]);

    useEffect(() => {
        if (callVerification) sessionStorage.setItem(`call_verification_${id}`, JSON.stringify(callVerification));
    }, [callVerification, id]);

    const handleStartVerification = async () => {
        if (!provider.phone || provider.phone === 'N/A') {
            alert('No phone number available for this provider');
            return;
        }

        setVerificationLoading(true);
        setConversation([]);  // Clear previous conversation

        try {
            const verificationRequest = {
                provider_id: provider.id,
                provider_name: provider.name,
                phone: provider.phone,
                specialty: provider.specialty !== 'N/A' ? provider.specialty : undefined,
                address: provider.address !== 'N/A' ? provider.address : undefined,
                license_number: provider.licenseInfo?.license_number,
                hospital: provider.hospitalAffiliation?.hospital_name
            };

            const response = await startVerification(verificationRequest);

            if (response.data.success) {
                setCurrentSession(response.data);

                // Start conversation simulation
                simulateSmartConversation();
            } else {
                alert('Failed to send verification: ' + response.data.message);
            }
        } catch (error) {
            console.error('Verification error:', error);
            alert('Error sending verification SMS');
        } finally {
            setVerificationLoading(false);
        }
    };

    // Simulate intelligent conversation based on validation issues
    const simulateSmartConversation = () => {
        // ONLY ask about MUTABLE fields (address, hospital) 
        // SKIP: phone (delivery proves it), specialty (doesn't change)
        const issues = [];

        // Address - practices relocate
        if (provider.address) {
            issues.push({
                field: 'address',
                question: 'Is your practice still at: MG Road, Bangalore 560001?',
                correction: '456 New Medical Plaza, MG Road, Bangalore 560001'
            });
        }

        // Hospital affiliation - doctors switch hospitals
        if (provider.hospitalAffiliation) {
            issues.push({
                field: 'hospital',
                question: 'Are you still affiliated with Apollo Hospital?',
                correction: 'Fortis Hospital, Bangalore'
            });
        }

        // Initial SMS
        setTimeout(() => {
            setConversation([{
                sender: 'system',
                message: `Hi ${provider.name}, we're verifying your provider information.`,
                time: new Date()
            }]);

            // Ask about first issue
            setTimeout(() => {
                if (issues.length > 0) {
                    setConversation(prev => [...prev, {
                        sender: 'system',
                        message: issues[0].question,
                        time: new Date()
                    }]);

                    // Provider responds NO
                    setTimeout(() => {
                        setConversation(prev => [...prev, {
                            sender: 'provider',
                            message: 'NO, that needs updating',
                            time: new Date()
                        }]);

                        setCurrentSession(prev => ({
                            ...prev,
                            status: 'CORRECTIONS_NEEDED',
                            provider_response: 'NO'
                        }));

                        // Request correction
                        setTimeout(() => {
                            setConversation(prev => [...prev, {
                                sender: 'system',
                                message: 'Please reply with the correct information.',
                                time: new Date()
                            }]);

                            // Provider provides correction
                            setTimeout(() => {
                                const corrections = {};
                                issues.forEach(issue => {
                                    corrections[issue.field] = issue.correction;
                                });

                                setConversation(prev => [...prev, {
                                    sender: 'provider',
                                    message: Object.entries(corrections).map(([k, v]) => `${k}: ${v}`).join('\n'),
                                    time: new Date()
                                }]);

                                setCurrentSession(prev => ({
                                    ...prev,
                                    status: 'COMPLETED',
                                    corrections,
                                    completed_at: new Date().toISOString()
                                }));
                            }, 3000);
                        }, 2000);
                    }, 2000);
                }
            }, 1500);
        }, 500);
    };

    const pollVerificationStatus = (sessionId) => {
        const interval = setInterval(async () => {
            try {
                const response = await getVerificationStatus(sessionId);
                const session = response.data;

                setCurrentSession(session);

                // Stop polling if completed
                if (['CONFIRMED', 'COMPLETED', 'FAILED', 'TIMEOUT'].includes(session.status)) {
                    clearInterval(interval);
                    fetchVerificationHistory(); // Refresh history
                }
            } catch (error) {
                console.error('Error polling status:', error);
                clearInterval(interval);
            }
        }, 5000); // Poll every 5 seconds

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(interval), 300000);
    };

    const fetchProvider = async () => {
        try {
            // Check sessionStorage first - if we have cached data, use it
            const cachedProvider = sessionStorage.getItem(`provider_${id}`);
            if (cachedProvider) {
                setProvider(JSON.parse(cachedProvider));
                setLoading(false);
                return;
            }

            // Load validation results from localStorage only if no cache
            const storedResults = localStorage.getItem('validationResults');

            if (!storedResults) {
                setProvider({ id, name: 'Unknown Provider', specialty: 'N/A', verified: false, status: 'Not Found' });
                setLoading(false);
                return;
            }

            const results = JSON.parse(storedResults);
            // Find the provider by ID
            const validationResult = results.find(r => r.provider_id === id);

            if (!validationResult) {
                setProvider({ id, name: 'Unknown Provider', specialty: 'N/A', verified: false, status: 'Not Found' });
                setLoading(false);
                return;
            }

            // Map validation result to provider detail format
            const providerData = {
                id: validationResult.provider_id,
                name: validationResult.provider_name,
                specialty: validationResult.verified_specialty || 'Unknown',
                phone: validationResult.verified_phone || 'N/A',
                address: validationResult.verified_address || 'N/A',
                email: validationResult.verified_email || 'N/A',
                npi: validationResult.npi_number || 'N/A',

                // Get old values from discrepancies
                oldPhone: validationResult.discrepancies?.phone?.current_value || validationResult.verified_phone,
                oldAddress: validationResult.discrepancies?.address?.current_value || validationResult.verified_address,
                oldSpecialty: validationResult.discrepancies?.specialty?.current_value,

                // All discrepancies for comprehensive display
                discrepancies: validationResult.discrepancies || {},

                // Status mapping
                status: validationResult.validation_status === 'VERIFIED' ? 'Verified' :
                    validationResult.validation_status === 'PARTIALLY_VERIFIED' ? 'Needs Review' :
                        validationResult.validation_status === 'FLAGGED' ? 'Needs Review' : 'Auto-Updated',
                verified: validationResult.validation_status === 'VERIFIED',
                validationStatus: validationResult.validation_status,

                // Confidence scores
                confidence: Math.round(validationResult.confidence_scores.overall_confidence * 100),
                confidenceScore: Math.round(validationResult.confidence_scores.overall_confidence * 100),
                confidenceScores: validationResult.confidence_scores,

                // Source information - store ALL matched sources
                sourcesMatched: validationResult.sources_matched || [],
                sourcesChecked: validationResult.sources_checked || [],
                lastUpdated: validationResult.validation_timestamp || new Date().toISOString(),

                // Additional metadata
                matchedSources: validationResult.sources_matched?.length || 0,

                // License and hospital info
                licenseInfo: validationResult.license_info,
                hospitalAffiliation: validationResult.hospital_affiliation,

                // VALIDATION ISSUES & FLAGS
                issues: validationResult.issues || [],
                riskFlags: validationResult.risk_flags || [],
                requiresManualReview: validationResult.requires_manual_review || false,
                requiresContactVerification: validationResult.requires_contact_verification || false,
                nextSteps: validationResult.next_steps || []
            };

            setProvider(providerData);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching provider", error);
            setProvider({ id, name: 'Unknown Provider', specialty: 'N/A', verified: false, status: 'Not Found' });
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (!provider) return <div className="p-8 text-center">Provider not found</div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeft size={18} /> Back to Directory
            </button>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-poster text-white">{provider.name}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="bg-white/5 px-2 py-1 rounded border border-white/10">ID: {provider.id}</span>
                        <span>{provider.specialty}</span>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-full border ${provider.status === 'Verified' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                    provider.status === 'Needs Review' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                        'bg-blue-500/20 border-blue-500/30 text-blue-400'
                    }`}>
                    <span className="font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                        {provider.status === 'Verified' ? <CheckCircle size={14} /> :
                            provider.status === 'Needs Review' ? <AlertTriangle size={14} /> :
                                <Clock size={14} />}
                        {provider.status}
                    </span>
                </div>
            </div>

            {/* Manual Review Banner */}
            {provider.requiresManualReview && (
                <div className="glass-panel p-4 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={24} className="text-yellow-400" />
                        <div>
                            <h4 className="font-semibold text-yellow-400">Requires Manual Review</h4>
                            <p className="text-sm text-slate-300">This provider has been flagged for manual verification</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Compliance Intelligence Panel */}
            <CompliancePanel providerId={provider.id} providerData={provider} />

            {/* Issues & Risk Flags */}
            {(provider.issues?.length > 0 || provider.riskFlags?.length > 0 || (provider.licenseInfo?.status && provider.licenseInfo.status !== 'Active')) && (
                <div className="glass-panel p-6 rounded-2xl border-2 border-red-500/30">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-400">
                        <AlertTriangle size={20} />
                        Issues Detected
                    </h3>
                    <div className="space-y-3">
                        {/* License Status Issues */}
                        {provider.licenseInfo?.status && provider.licenseInfo.status !== 'Active' && (
                            <div className={`p-4 rounded-xl border-2 ${provider.licenseInfo.status === 'Revoked' ? 'bg-red-500/20 border-red-500 text-red-300' :
                                provider.licenseInfo.status === 'Suspended' ? 'bg-orange-500/20 border-orange-500 text-orange-300' :
                                    'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                                }`}>
                                <div className="flex items-start gap-3">
                                    <Shield size={20} className="mt-0.5" />
                                    <div>
                                        <p className="font-semibold">License Status: {provider.licenseInfo.status}</p>
                                        {provider.licenseInfo.license_number && (
                                            <p className="text-sm opacity-90">License: {provider.licenseInfo.license_number}</p>
                                        )}
                                        {provider.licenseInfo.status === 'Revoked' && (
                                            <p className="text-sm mt-1 font-medium">Provider should NOT be practicing with revoked license</p>
                                        )}
                                        {provider.licenseInfo.status === 'Suspended' && (
                                            <p className="text-sm mt-1 font-medium">License suspended - requires immediate review</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Validation Issues */}
                        {provider.issues?.map((issue, idx) => {
                            const severityColors = {
                                'CRITICAL': 'bg-red-500/20 border-red-500/50 text-red-300',
                                'HIGH': 'bg-orange-500/20 border-orange-500/50 text-orange-300',
                                'MEDIUM': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
                                'LOW': 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                            };
                            return (
                                <div key={idx} className={`p-3 rounded-lg border ${severityColors[issue.severity] || severityColors['LOW']}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="font-medium">{issue.issue}</p>
                                            {issue.source && <p className="text-xs mt-1 opacity-75">Source: {issue.source}</p>}
                                            {issue.recommendation && (
                                                <p className="text-sm mt-2 italic">→ {issue.recommendation}</p>
                                            )}
                                        </div>
                                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{issue.severity}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Risk Flags */}
                        {provider.riskFlags?.map((flag, idx) => {
                            const severityColors = {
                                'CRITICAL': 'bg-red-500/20 border-red-500/50 text-red-300',
                                'HIGH': 'bg-orange-500/20 border-orange-500/50 text-orange-300',
                                'MEDIUM': 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
                                'LOW': 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                            };
                            return (
                                <div key={idx} className={`p-3 rounded-lg border ${severityColors[flag.severity] || severityColors['LOW']}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="font-medium">{flag.flag}</p>
                                            {flag.description && <p className="text-sm mt-1">{flag.description}</p>}
                                        </div>
                                        <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{flag.severity}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* SMS Verification Section */}
            <div className="glass-panel p-6 rounded-2xl mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <MessageSquare size={20} />
                        SMS Verification
                    </h3>
                    <button
                        onClick={handleStartVerification}
                        disabled={verificationLoading || !provider.phone || provider.phone === 'N/A'}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                        <Send size={16} />

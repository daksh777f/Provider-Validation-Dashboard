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

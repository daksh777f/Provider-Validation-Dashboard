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

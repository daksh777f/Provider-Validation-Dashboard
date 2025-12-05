import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, ChevronRight, Phone, MapPin, AlertCircle, CheckCircle, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

const Directory = () => {
    const [providers, setProviders] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', specialty: '', phone: '', address: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const tableRef = useRef(null);
    const modalRef = useRef(null);
    const navigate = useNavigate();

    const specialties = ['Cardiology', 'Dermatology', 'Neurology', 'Pediatrics', 'Oncology', 'General Practice'];

    useEffect(() => {
        fetchProviders();
    }, [search, statusFilter]);

    const fetchProviders = async () => {
        try {
            // Load validated providers from localStorage
            const storedResults = localStorage.getItem('validationResults');
            let allProviders = [];

            if (storedResults) {
                const results = JSON.parse(storedResults);
                // Convert validation results to provider format
                allProviders = results.map((result, index) => ({
                    id: result.provider_id || `provider-${index + 1}`,
                    name: result.provider_name,
                    specialty: result.verified_specialty || 'Unknown',
                    phone: result.verified_phone || 'N/A',
                    address: result.verified_address || 'N/A',
                    confidence: Math.round(result.confidence_scores.overall_confidence * 100),
                    status: result.validation_status === 'VERIFIED' ? 'Verified' :
                        result.validation_status === 'PARTIALLY_VERIFIED' ? 'Needs Review' :
                            result.validation_status === 'FLAGGED' ? 'Needs Review' :
                                'Auto-Updated'
                }));
            }

            let filtered = allProviders;

            if (search) {
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    p.specialty.toLowerCase().includes(search.toLowerCase())
                );
            }

            if (statusFilter) {
                filtered = filtered.filter(p => p.status === statusFilter);
            }

            setProviders(filtered);

            // Animate rows in
            if (tableRef.current && filtered.length > 0) {
                gsap.fromTo(tableRef.current.children,
                    { y: 20, opacity: 0 },
                    { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
                );
            }
        } catch (error) {
            console.error("Error fetching providers", error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Verified': return 'bg-neon-mint/20 text-neon-mint border-neon-mint/30 shadow-none';
            case 'Needs Review': return 'bg-accent/20 text-accent border-accent/30 shadow-none';
            case 'Auto-Updated': return 'bg-neon-blue/20 text-neon-blue border-neon-blue/30 shadow-none';
            default: return 'bg-surface text-slate-400 border-white/10';
        }
    };

    const handleOpenModal = () => {
        setShowModal(true);
        if (modalRef.current) {
            gsap.fromTo(modalRef.current,
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.7)' }
            );
        }
    };

    const handleCloseModal = () => {
        if (modalRef.current) {
            gsap.to(modalRef.current, {
                opacity: 0,
                scale: 0.9,
                duration: 0.2,
                onComplete: () => {
                    setShowModal(false);
                    setFormData({ name: '', specialty: '', phone: '', address: '' });
                }
            });
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Add new provider to mock data
            const newProvider = {
                id: providers.length + 1,
                ...formData,
                confidence: 75,
                status: 'Needs Review'
            };
            setProviders([...providers, newProvider]);
            handleCloseModal();

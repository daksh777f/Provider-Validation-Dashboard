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

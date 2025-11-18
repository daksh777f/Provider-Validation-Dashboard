import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import StatCard from '../components/StatCard';
import WorldMap from '../components/WorldMap';
import { checkHealth, getStats } from '../services/api';
import gsap from 'gsap';

const Dashboard = () => {
    const [stats, setStats] = useState({
        total: 1250,
        issues: 87,
        autoUpdated: 42,
        needsReview: 145,
        avgConfidence: 92
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [apiConnected, setApiConnected] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                await checkHealth();
                setApiConnected(true);

                const statsRes = await getStats();
                if (statsRes.data) {
                    setStats({
                        total: statsRes.data.total_validations || 1250,
                        issues: statsRes.data.failed || 87,
                        autoUpdated: statsRes.data.successful || 42,
                        needsReview: statsRes.data.total_validations - statsRes.data.successful || 145,

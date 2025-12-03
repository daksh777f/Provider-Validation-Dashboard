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
                        avgConfidence: Math.round((statsRes.data.average_confidence || 0.92) * 100)
                    });
                }
                setError(null);
            } catch (err) {
                console.error('Error fetching data:', err);
                // Use mock data as fallback
                setStats({
                    total: 1250,
                    issues: 87,
                    autoUpdated: 42,
                    needsReview: 145,
                    avgConfidence: 92
                });
                setApiConnected(false);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        gsap.fromTo('.stat-card',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.6, stagger: 0.1 }
        );
    }, [stats]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                <p className="text-gray-400">Provider validation system overview</p>
                {!apiConnected && <p className="text-sm text-yellow-400 mt-2">Using demo data (backend not connected)</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    className="stat-card"
                    title="Total Providers"
                    value={stats.total}
                    icon={Users}
                    trend={"+2.5%"}
                />
                <StatCard
                    className="stat-card"
                    title="Issues Found"
                    value={stats.issues}
                    icon={AlertTriangle}
                    trend={"-1.2%"}
                    isAlert
                />
                <StatCard
                    className="stat-card"
                    title="Auto Updated"
                    value={stats.autoUpdated}
                    icon={CheckCircle}
                    trend={"+5.3%"}
                />
                <StatCard
                    className="stat-card"
                    title="Needs Review"
                    value={stats.needsReview}
                    icon={Activity}
                    trend={"+3.1%"}
                />
                <StatCard
                    className="stat-card"

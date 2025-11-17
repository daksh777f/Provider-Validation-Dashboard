import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';

const Settings = () => {
    const [settings, setSettings] = useState({
        autoUpdateThreshold: 80,
        escalationThreshold: 60,
        theme: 'dark'
    });

    useEffect(() => {
        // Load settings from localStorage or use defaults
        const saved = localStorage.getItem('appSettings');
        if (saved) {
            setSettings(JSON.parse(saved));
        }
    }, []);

    const handleSave = async () => {
        // Save to localStorage
        localStorage.setItem('appSettings', JSON.stringify(settings));
        alert('Settings saved!');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-poster text-white">System Configuration</h1>

            <div className="glass-panel p-8 rounded-2xl space-y-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4 text-white">Confidence Thresholds</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-slate-400">Auto-Update Threshold</label>
                                <span className="text-primary font-bold">{settings.autoUpdateThreshold}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={settings.autoUpdateThreshold}
                                onChange={(e) => setSettings({ ...settings, autoUpdateThreshold: parseInt(e.target.value) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <p className="text-xs text-slate-500 mt-1">Records with confidence above this score will be automatically updated without review.</p>
                        </div>

                        <div>

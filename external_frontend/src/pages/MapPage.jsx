import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity } from 'lucide-react';
import WorldMap from '../components/WorldMap';

const MapPage = () => {
    const navigate = useNavigate();
    const [providers, setProviders] = useState([]);
    const [regionData, setRegionData] = useState({ east: 0, west: 0, central: 0, international: 0 });
    const [loading, setLoading] = useState(true);

    // Mock provider data
    const mockProviders = [
        { id: 1, name: 'Dr. Sarah Johnson', address: 'New York, NY', region: 'east' },
        { id: 2, name: 'Dr. Michael Chen', address: 'San Francisco, CA', region: 'west' },
        { id: 3, name: 'Dr. Emily Rodriguez', address: 'Chicago, IL', region: 'central' },
        { id: 4, name: 'Dr. James Wilson', address: 'London, UK', region: 'international' },
        { id: 5, name: 'Dr. Lisa Anderson', address: 'Boston, MA', region: 'east' },
        { id: 6, name: 'Dr. David Brown', address: 'Seattle, WA', region: 'west' },
        { id: 7, name: 'Dr. Jennifer Lee', address: 'Toronto, Canada', region: 'international' },
        { id: 8, name: 'Dr. Robert Taylor', address: 'Houston, TX', region: 'central' },
    ];

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                setProviders(mockProviders);

                // Process regions
                const regions = { east: 0, west: 0, central: 0, international: 0 };
                mockProviders.forEach(p => {
                    const address = (p.address || '').toLowerCase();
                    if (address.includes('ny') || address.includes('ma') || address.includes('pa') ||
                        address.includes('nj') || address.includes('ct') || address.includes('vt') ||
                        address.includes('new york') || address.includes('boston') || address.includes('philadelphia')) {
                        regions.east++;
                    } else if (address.includes('ca') || address.includes('wa') || address.includes('or') ||
                        address.includes('az') || address.includes('nv') || address.includes('ut') ||
                        address.includes('california') || address.includes('seattle') || address.includes('portland')) {
                        regions.west++;
                    } else if (address.includes('india') || address.includes('mumbai') || address.includes('delhi') ||
                        address.includes('bangalore') || address.includes('hyderabad') || address.includes('chennai') ||
                        address.includes('uk') || address.includes('london') || address.includes('europe') ||
                        address.includes('canada') || address.includes('toronto') || address.includes('australia')) {
                        regions.international++;
                    } else {
                        regions.central++;
                    }
                });
                setRegionData(regions);
            } catch (error) {
                console.error("Failed to fetch map data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProviders();

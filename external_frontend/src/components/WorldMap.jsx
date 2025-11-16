import React, { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Tooltip } from "react-tooltip";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const WorldMap = ({ regionData }) => {
    const [content, setContent] = useState("");
    const [hoveredGEO, setHoveredGEO] = useState(null);

    // Generate a consistent, unique neon color for any string (Country Name)
    const getCountryColor = (name) => {
        if (!name) return "#1e293b";

        // Override for USA to be Purple
        if (name === "United States of America" || name === "USA" || name === "United States") {
            return "#a855f7"; // Neon Purple
        }

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Generate HSL color:
        // Hue: Use the hash to pick a value between 0 and 360
        const h = Math.abs(hash) % 360;
        // Saturation: Keep it high (70-100%) for neon look
        const s = 80 + (Math.abs(hash) % 20);
        // Lightness: Keep it bright but not white (45-65%)
        const l = 50 + (Math.abs(hash) % 15);

        return `hsl(${h}, ${s}%, ${l}%)`;
    };

    // Markers for the regions
    const markers = [
        { name: "West US", coordinates: [-119.4179, 36.7783], count: regionData.west, color: "#C084FC" },
        { name: "Central US", coordinates: [-95.7129, 37.0902], count: regionData.central, color: "#2dd4bf" },
        { name: "East US", coordinates: [-74.0060, 40.7128], count: regionData.east, color: "#6366F1" },
        { name: "Europe", coordinates: [10.4515, 51.1657], count: Math.floor(regionData.international * 0.3) + (regionData.international > 0 ? 1 : 0), color: "#f59e0b" },
        { name: "India", coordinates: [78.9629, 20.5937], count: Math.ceil(regionData.international * 0.5), color: "#f59e0b" },
        { name: "Australia", coordinates: [133.7751, -25.2744], count: Math.floor(regionData.international * 0.2), color: "#f59e0b" },
    ].filter(m => m.count > 0 || m.name.includes("US"));

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 relative overflow-hidden rounded-xl">
            {/* Controls Info */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 pointer-events-none">
                <div className="bg-slate-900/90 text-slate-400 text-xs px-3 py-2 rounded-lg border border-white/10 backdrop-blur-md shadow-lg">
                    Scroll to Zoom • Drag to Pan
                </div>
            </div>

import React, { useState, useEffect } from 'react';
import { MapPin, Search, Loader2, Navigation, ExternalLink, Building2, Landmark, Coffee, X } from 'lucide-react';
import { searchNearbyPlaces } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

const MapLocator: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ text: string, sources: { title?: string, uri?: string }[] } | null>(null);
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapUrl, setMapUrl] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    handleGetLocation();
    // Hide sidebar by default on mobile
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, []);

  useEffect(() => {
    if (location) {
      setMapUrl(`https://www.google.com/maps?q=${location.latitude},${location.longitude}&output=embed`);
    }
  }, [location]);

  const handleGetLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(newLoc);
          setMapUrl(`https://www.google.com/maps?q=${newLoc.latitude},${newLoc.longitude}&output=embed`);
          setLocating(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocating(false);
        }
      );
    } else {
      setLocating(false);
    }
  };

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setMapUrl(`https://www.google.com/maps?q=${encodeURIComponent(searchQuery)}&output=embed`);
    if (window.innerWidth < 768) setShowSidebar(true);
    try {
      const res = await searchNearbyPlaces(searchQuery, location || undefined);
      setResults(res);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickSearches = [
    { label: 'Nearby Banks', icon: Landmark, query: 'Banks and ATMs' },
    { label: 'Tax Offices', icon: Building2, query: 'FIRS Tax Offices' },
    { label: 'Hospitals', icon: Navigation, query: 'Hospitals' },
    { label: 'Restaurants', icon: Coffee, query: 'Restaurants' },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <header className="p-3 md:p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between shrink-0 gap-3">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2 md:gap-3">
            <MapPin className="text-blue-600" size={24} />
            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">Service Locator</h1>
          </div>
          <button 
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
          >
            {showSidebar ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search services..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-900 border border-transparent focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500 rounded-lg outline-none transition dark:text-white text-sm"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50 text-sm shrink-0"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Results */}
        <div className={`
          absolute inset-y-0 left-0 z-10 w-full md:relative md:w-80 lg:w-96 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 overflow-hidden transition-transform duration-300
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:hidden'}
        `}>
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-2">
              {quickSearches.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setQuery(item.query);
                    handleSearch(item.query);
                  }}
                  className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
                >
                  <item.icon className="text-slate-400" size={14} />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="animate-spin mb-2" size={32} />
                <p className="text-sm">Searching nearby...</p>
              </div>
            )}

            {results && !loading && (
              <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="prose prose-sm dark:prose-invert max-w-none mb-6 text-slate-600 dark:text-slate-300">
                  <ReactMarkdown>{results.text}</ReactMarkdown>
                </div>

                {results.sources.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified Locations</h3>
                    {results.sources.map((source, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl hover:border-blue-300 transition group cursor-pointer"
                        onClick={() => {
                          setMapUrl(`https://www.google.com/maps?q=${encodeURIComponent(source.title || '')}&output=embed`);
                          if (window.innerWidth < 768) setShowSidebar(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate">
                              {source.title || 'Location Result'}
                            </p>
                            <a
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View on Google Maps <ExternalLink size={10} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!results && !loading && (
              <div className="text-center py-12">
                <MapPin className="mx-auto text-slate-200 dark:text-slate-700 mb-3" size={48} />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Search for a service or select a category above to see results.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Map View */}
        <div className="flex-1 bg-slate-200 dark:bg-slate-950 relative">
          {mapUrl ? (
            <iframe
              src={mapUrl}
              className="w-full h-full border-none"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <Navigation className="animate-pulse mb-4" size={48} />
              <p>Initializing Map View...</p>
            </div>
          )}

          {/* Floating Controls */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2">
            <button
              onClick={handleGetLocation}
              className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition border border-slate-200 dark:border-slate-700"
              title="My Location"
            >
              <Navigation size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapLocator;

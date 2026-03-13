import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseService';
import { Plus, Trash2, Save, Loader2, Calendar, Image as ImageIcon, Zap, Brain } from 'lucide-react';

const ChallengeAdmin = () => {
    const [days, setDays] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [resources, setResources] = useState<any[]>([]);
    
    // Form states
    const [resourceType, setResourceType] = useState<'WAT' | 'SRT' | 'TAT'>('WAT');
    const [bulkInput, setBulkInput] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDays();
    }, []);

    const fetchDays = async () => {
        setLoading(true);
        // In a real app, this would fetch from a challenge_days table
        // For now, we'll mock 14 days
        const mockDays = Array.from({ length: 14 }, (_, i) => ({
            id: i + 1,
            day_number: i + 1,
            title: `Day ${i + 1}`,
        }));
        setDays(mockDays);
        setLoading(false);
    };

    const fetchResources = async (dayNumber: number) => {
        // Fetch resources for this specific day
        const { data, error } = await supabase
            .from('challenge_resources')
            .select('*')
            .eq('day_number', dayNumber)
            .order('created_at', { ascending: true });
            
        if (!error && data) {
            setResources(data);
        } else {
            setResources([]);
        }
    };

    const handleDaySelect = (dayNumber: number) => {
        setSelectedDay(dayNumber);
        fetchResources(dayNumber);
    };

    const handleAddResources = async () => {
        if (!selectedDay) return;
        setUploading(true);
        
        try {
            if (resourceType === 'TAT' && imageFile) {
                const fileName = `challenge-tat-${selectedDay}-${Date.now()}-${imageFile.name}`;
                await supabase.storage.from('scenarios').upload(fileName, imageFile);
                const { data: { publicUrl } } = supabase.storage.from('scenarios').getPublicUrl(fileName);
                
                const { error } = await supabase.from('challenge_resources').insert({
                    day_number: selectedDay,
                    resource_type: 'TAT',
                    content: publicUrl
                });
                if (error) throw error;
                setImageFile(null);
            } else if (resourceType === 'TAT' && bulkInput === 'BLANK') {
                const { error } = await supabase.from('challenge_resources').insert({
                    day_number: selectedDay,
                    resource_type: 'TAT',
                    content: 'BLANK'
                });
                if (error) throw error;
                setBulkInput('');
            } else if ((resourceType === 'WAT' || resourceType === 'SRT') && bulkInput.trim()) {
                const items = bulkInput.split('\n').map(i => i.trim()).filter(i => i);
                const payload = items.map(item => ({
                    day_number: selectedDay,
                    resource_type: resourceType,
                    content: item
                }));
                
                const { error } = await supabase.from('challenge_resources').insert(payload);
                if (error) throw error;
                setBulkInput('');
            }
            
            alert('Resources added successfully!');
            fetchResources(selectedDay);
        } catch (error) {
            console.error('Error adding resources:', error);
            alert('Failed to add resources.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteResource = async (id: string) => {
        if (!confirm('Delete this resource?')) return;
        await supabase.from('challenge_resources').delete().eq('id', id);
        if (selectedDay) fetchResources(selectedDay);
    };

    return (
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="text-blue-500" /> 14 Days PSYC Challenge Admin
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Days Sidebar */}
                <div className="col-span-1 space-y-2">
                    <h3 className="font-semibold text-slate-400 mb-4 uppercase text-sm tracking-wider">Select Day</h3>
                    <div className="max-h-[600px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {days.map(day => (
                            <button
                                key={day.id}
                                onClick={() => handleDaySelect(day.day_number)}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                                    selectedDay === day.day_number 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                Day {day.day_number}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Resource Management Area */}
                <div className="col-span-1 md:col-span-3 bg-slate-800 rounded-xl p-6 border border-slate-700">
                    {selectedDay ? (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                                <h3 className="text-xl font-bold">Managing Resources for Day {selectedDay}</h3>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-slate-900 rounded-full text-xs font-medium text-slate-300">
                                        {resources.filter(r => r.resource_type === 'TAT').length} TAT
                                    </span>
                                    <span className="px-3 py-1 bg-slate-900 rounded-full text-xs font-medium text-slate-300">
                                        {resources.filter(r => r.resource_type === 'WAT').length} WAT
                                    </span>
                                    <span className="px-3 py-1 bg-slate-900 rounded-full text-xs font-medium text-slate-300">
                                        {resources.filter(r => r.resource_type === 'SRT').length} SRT
                                    </span>
                                </div>
                            </div>
                            
                            {/* Add Resource Form */}
                            <div className="bg-slate-900 p-5 rounded-xl border border-slate-700">
                                <h4 className="font-semibold mb-4 flex items-center gap-2">
                                    <Plus size={18} className="text-yellow-400" /> Add Fresh Resources
                                </h4>
                                
                                <div className="flex gap-4 mb-4">
                                    <button 
                                        onClick={() => setResourceType('WAT')}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${resourceType === 'WAT' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <Zap size={16} /> WAT Words
                                    </button>
                                    <button 
                                        onClick={() => setResourceType('SRT')}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${resourceType === 'SRT' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <Brain size={16} /> SRT Situations
                                    </button>
                                    <button 
                                        onClick={() => setResourceType('TAT')}
                                        className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${resourceType === 'TAT' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        <ImageIcon size={16} /> TAT Picture
                                    </button>
                                </div>
                                
                                {resourceType === 'TAT' ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 mb-4">
                                            <button
                                                onClick={() => {
                                                    setBulkInput('BLANK');
                                                    setImageFile(null);
                                                }}
                                                className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${bulkInput === 'BLANK' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                            >
                                                Use Blank Slide
                                            </button>
                                            <span className="text-slate-500 text-sm">OR</span>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    setImageFile(e.target.files?.[0] || null);
                                                    setBulkInput('');
                                                }}
                                                className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl p-3"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <textarea
                                            value={bulkInput}
                                            onChange={(e) => setBulkInput(e.target.value)}
                                            placeholder={`Paste ${resourceType} items here (one per line)...`}
                                            className="w-full h-32 bg-slate-800 text-white border border-slate-700 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                        />
                                    </div>
                                )}
                                
                                <button
                                    onClick={handleAddResources}
                                    disabled={uploading || (resourceType === 'TAT' && !imageFile && bulkInput !== 'BLANK') || (resourceType !== 'TAT' && !bulkInput.trim())}
                                    className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    {uploading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                    Save Resources to Day {selectedDay}
                                </button>
                            </div>
                            
                            {/* Existing Resources List */}
                            <div>
                                <h4 className="font-semibold mb-4 text-slate-300">Current Resources for Day {selectedDay}</h4>
                                {resources.length === 0 ? (
                                    <div className="text-center p-8 bg-slate-900 rounded-xl border border-dashed border-slate-700 text-slate-500">
                                        No resources added for this day yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {resources.map((res, idx) => (
                                            <div key={res.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-700">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                        res.resource_type === 'WAT' ? 'bg-blue-900/50 text-blue-400' :
                                                        res.resource_type === 'SRT' ? 'bg-purple-900/50 text-purple-400' :
                                                        'bg-orange-900/50 text-orange-400'
                                                    }`}>
                                                        {res.resource_type}
                                                    </span>
                                                    {res.resource_type === 'TAT' ? (
                                                        <a href={res.content} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline truncate">
                                                            View Image
                                                        </a>
                                                    ) : (
                                                        <span className="text-sm text-slate-300 truncate">{res.content}</span>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteResource(res.id)}
                                                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p className="text-lg">Select a day from the sidebar to manage its resources.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChallengeAdmin;

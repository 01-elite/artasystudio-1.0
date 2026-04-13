import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as MapTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    LayoutDashboard, Users, Map as MapIcon, LogOut, 
    ChevronRight, TrendingUp, Database, ShoppingBag, 
    Zap, Loader2, AlertCircle, ShieldCheck, Search,
    Trash2, Eye, X, BarChart3, Heart, MapPin, Activity,
    Award, Bell, Settings
} from 'lucide-react';

const Analytics = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);

    const geoMap = { 
        "mumbai": [19.0760, 72.8777], 
        "pune": [18.5204, 73.8567], 
        "delhi": [28.6139, 77.2090], 
        "bangalore": [12.9716, 77.5946], 
        "lucknow": [26.8467, 80.9462],
        "hyderabad": [17.3850, 78.4867],
        "chennai": [13.0827, 80.2707]
    };

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5001/api/admin/stats');
            setData(res.data);
        } catch (err) { console.error("Fetch Error:", err); } 
        finally { setLoading(false); }
    };

    const handleBan = async (id) => {
        if (window.confirm("⚠️ SYSTEM ALERT: Are you sure you want to permanently terminate this account?")) {
            try {
                await axios.delete(`http://localhost:5001/api/admin/user/${id}`);
                alert("User successfully wiped.");
                fetchStats();
                setSelectedUser(null);
            } catch (err) { alert("Action Failed."); }
        }
    };

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
            <div className="relative flex items-center justify-center">
                <Loader2 className="animate-spin text-[#FF8C00] relative z-10" size={60}/>
                <div className="absolute inset-0 blur-2xl bg-orange-200 opacity-50 animate-pulse"></div>
            </div>
            <p className="mt-6 font-black uppercase tracking-[0.4em] text-gray-400 text-xs italic">Syncing Core Intelligence...</p>
        </div>
    );

    const formattedRevenue = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((name, i) => {
        const found = data?.revenueTrend?.find(d => d._id === i + 1);
        return { month: name, revenue: found ? found.total : 0 };
    });

    const filteredUsers = data?.userAnalytics?.filter(u => 
        (u.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden font-sans">
            
            {/* --- MASTER SIDEBAR --- */}
            <aside className="w-72 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen z-50">
                <div className="p-8 pb-12">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="h-10 w-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                            <Zap className="text-[#FF8C00] fill-[#FF8C00]" size={20}/>
                        </div>
                        <h2 className="text-xl font-black italic tracking-tighter">ARTVISTA <span className="text-[#FF8C00]">PRO.</span></h2>
                    </div>
                    
                    <nav className="space-y-2 flex-1 text-left">
                        <SidebarBtn id="overview" label="Dashboard" icon={<LayoutDashboard size={18}/>} active={activeTab} set={setActiveTab}/>
                        <SidebarBtn id="users" label="User Registry" icon={<Users size={18}/>} active={activeTab} set={setActiveTab}/>
                        <SidebarBtn id="powerbi" label="Power BI Node" icon={<Database size={18}/>} active={activeTab} set={setActiveTab}/>
                    </nav>
                </div>

                <div className="mt-auto p-8 border-t border-gray-50 space-y-4">
                    <div className="bg-orange-50 p-4 rounded-2xl text-left">
                        <p className="text-[10px] font-black text-[#FF8C00] uppercase tracking-widest mb-1">System Health</p>
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            <p className="text-[11px] font-bold text-gray-600 uppercase">Nodes Operational</p>
                        </div>
                    </div>
                    <button className="w-full flex items-center gap-4 p-4 text-gray-400 hover:text-red-500 font-bold text-[11px] uppercase tracking-widest transition-all">
                        <LogOut size={18}/> Exit Terminal
                    </button>
                </div>
            </aside>

            {/* --- MAIN INTERFACE --- */}
            <div className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                
                {/* --- SMART NAVBAR --- */}
                <nav className="h-24 bg-white/80 backdrop-blur-md border-b border-gray-50 flex items-center justify-between px-12 sticky top-0 z-40">
                    <div className="relative w-96 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#FF8C00] transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search Network Identities..." 
                            className="w-full pl-14 pr-6 py-3.5 bg-gray-50 border-transparent rounded-2xl font-bold outline-none focus:bg-white focus:border-orange-100 transition-all text-xs uppercase tracking-widest shadow-inner" 
                            onChange={(e)=>setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-black transition-all relative">
                                <Bell size={20}/>
                                <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-black transition-all">
                                <Settings size={20}/>
                            </button>
                        </div>
                        <div className="h-10 w-px bg-gray-100 mx-2"></div>
                        <div className="flex items-center gap-4 bg-black text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-black/10 transition-transform active:scale-95 cursor-pointer">
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Sayali G.</p>
                                <p className="text-[8px] font-bold text-[#FF8C00] uppercase opacity-80">Super Admin</p>
                            </div>
                            <div className="h-8 w-8 bg-[#FF8C00] rounded-lg flex items-center justify-center font-black text-black text-xs">SG</div>
                        </div>
                    </div>
                </nav>

                <main className="p-12 flex-1">
                    <header className="mb-12 text-left">
                        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
                            Studio <span className="text-gray-200">Intelligence.</span>
                        </h1>
                    </header>

                    {/* KPI CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                        <KPICard title="Net Revenue" val={`₹${(data?.kpis?.totalRevenue / 1000).toFixed(1)}k`} icon={<TrendingUp/>} trend="+12% MoM"/>
                        <KPICard title="Verified Artists" val={data?.kpis?.totalArtists} icon={<Award/>} trend="Active"/>
                        <KPICard title="Digital Assets" val={data?.kpis?.totalArt} icon={<ShoppingBag/>} trend="Museum Grade"/>
                        <KPICard title="Dormant Nodes" val={data?.inactiveCount} icon={<AlertCircle/>} trend="Inactive" color="text-red-500"/>
                    </div>

                    {/* SECTIONS */}
                    {activeTab === 'overview' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            <ChartBox title="Revenue Stream Analysis">
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={formattedRevenue}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#FF8C00" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#FF8C00" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94A3B8'}} dy={10}/>
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94A3B8'}}/>
                                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}/>
                                        <Area type="monotone" dataKey="revenue" stroke="#FF8C00" strokeWidth={5} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartBox>
                            
                            <ChartBox title="Regional Order Matrix">
                                <div className="h-[500px] w-full rounded-[3rem] overflow-hidden border border-gray-100 shadow-inner relative group">
                                    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%', background: '#f8fafc' }} zoomControl={false}>
                                        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                        {data.spatialClusters?.map((node, i) => {
                                            const position = geoMap[node._id?.toLowerCase().trim()] || [20, 78];
                                            return (
                                                <CircleMarker 
                                                   key={i} 
                                                   center={position} 
                                                   radius={10}
                                                   fillOpacity={0}  // ❌ remove fill
                                                        color="#FF8C00"
                                                   weight={2}
                                                   dashArray="3,5"   // 👈 dotted border
                                                   >
                                                    <MapTooltip direction="top" opacity={1} sticky>
                                                        <div className="bg-black text-white p-2 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                            {node._id}: {node.count} Orders
                                                        </div>
                                                    </MapTooltip>
                                                </CircleMarker>
                                            );
                                        })}
                                    </MapContainer>
                                </div>
                            </ChartBox>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="bg-white rounded-[2.5rem] border border-gray-50 shadow-sm overflow-hidden animate-in fade-in duration-700">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center text-left">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Identity Governance Matrix</h3>
                                <div className="flex gap-2">
                                    <span className="px-5 py-2 bg-orange-50 text-[#FF8C00] rounded-xl text-[10px] font-black uppercase tracking-widest border border-orange-100">
                                        {filteredUsers.length} Nodes Found
                                    </span>
                                </div>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-[9px] font-black uppercase text-gray-400 tracking-widest">
                                    <tr>
                                        <th className="px-10 py-6">User Identity</th>
                                        <th className="px-10 py-6 text-center">Assets (Posts)</th>
                                        <th className="px-10 py-6 text-center">Net Yield (Revenue)</th>
                                        <th className="px-10 py-6 text-right">Core Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredUsers.map(user => (
                                        <tr key={user._id} className="hover:bg-orange-50/20 transition-all group border-l-4 border-transparent hover:border-[#FF8C00]">
                                            <td className="px-10 py-7">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-white border border-gray-100 rounded-2xl flex items-center justify-center font-black text-lg group-hover:bg-black group-hover:text-white transition-all shadow-sm">
                                                        {user.name?.[0]}
                                                    </div>
                                                    <div className="text-left text-xs">
                                                        <p className="font-black text-gray-900 mb-0.5">{user.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold lowercase">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-gray-900 text-sm">{user.postsCount || 0}</span>
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Artworks</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-black text-[#FF8C00] text-sm">₹{(user.revenueGenerated || 0).toLocaleString()}</span>
                                                    <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-[#FF8C00]" style={{ width: user.revenueGenerated > 0 ? '70%' : '0%' }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-7 text-right space-x-3">
                                                <button onClick={() => setSelectedUser(user)} className="p-4 bg-white border border-gray-100 rounded-2xl hover:bg-black hover:text-white transition-all shadow-sm active:scale-95"><Eye size={18}/></button>
                                                {user.role !== 'admin' && (
                                                    <button onClick={() => handleBan(user._id)} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"><Trash2 size={18}/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'powerbi' && (
                        <div className="bg-white p-3 rounded-[4rem] shadow-2xl border-[12px] border-white animate-in zoom-in-95 duration-500 group relative">
                             <iframe title="PowerBI" width="100%" height="850" src="https://app.powerbi.com/reportEmbed?reportId=b27ff70b-5e72-4567-84a0-4f38325b35a1&autoAuth=true&ctid=a1b9280f-76c4-4299-8db8-c1f4804d5801" allowFullScreen={true} className="rounded-[3rem] grayscale contrast-125" />
                        </div>
                    )}
                </main>

                <footer className="mt-auto py-8 px-12 border-t border-gray-100 bg-white flex justify-between items-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300 italic text-left">ArtVista Intelligence Protocol // v2.1.0-Release</p>
                    <div className="flex gap-6">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Server: 200 OK</span>
                    </div>
                </footer>
            </div>

            {/* --- PROFILE OVERLAY --- */}
            {selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedUser(null)}></div>
                    <div className="relative w-full max-w-xl bg-white h-full rounded-[3rem] p-12 shadow-2xl animate-in slide-in-from-right-full duration-700 overflow-y-auto text-left border border-gray-50 flex flex-col">
                        <button onClick={() => setSelectedUser(null)} className="absolute top-10 right-10 p-4 bg-gray-50 text-gray-400 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"><X size={24}/></button>
                        
                        <div className="mb-12 border-b border-gray-50 pb-12">
                            <div className="w-24 h-24 bg-black text-[#FF8C00] rounded-[2.5rem] flex items-center justify-center text-4xl font-black mb-8 shadow-2xl">{selectedUser.name?.[0]}</div>
                            <h2 className="text-5xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">{selectedUser.name}</h2>
                            <p className="text-[#FF8C00] font-black uppercase text-[10px] tracking-[0.4em] mt-3">{selectedUser.email}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Net Revenue</p>
                                <p className="text-3xl font-black text-gray-900">₹{(selectedUser.revenueGenerated || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-8 bg-black rounded-[2.5rem] text-white relative overflow-hidden group">
                                <Heart size={16} className="text-red-500 mb-3 fill-red-500" />
                                <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1 relative z-10">Popular Asset</p>
                                <p className="text-xs font-black uppercase italic text-[#FF8C00] relative z-10">
                                    {selectedUser.popularArt?.title || "No Art Yet"}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-8 flex-1">
                            <div className="p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm">
                                <h4 className="text-[9px] font-black uppercase text-gray-300 mb-6 flex items-center gap-3 tracking-[0.3em]"><MapPin size={12}/> Logistics Node</h4>
                                <p className="text-sm font-black text-gray-800 italic">{selectedUser.address?.street || "Identity unverified"}</p>
                                <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase">{selectedUser.address?.city} {selectedUser.address?.pincode}</p>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <StatMini title="Posts" val={selectedUser.postsCount}/>
                                <StatMini title="Orders" val={selectedUser.ordersCount}/>
                                <StatMini title="Likes" val={selectedUser.popularArt?.likes || 0}/>
                            </div>
                        </div>

                        <div className="mt-12">
                            <button onClick={() => handleBan(selectedUser._id)} className="w-full py-7 bg-red-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-red-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                                <ShieldCheck size={20}/> Execute Removal Protocol
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- HELPERS ---
const SidebarBtn = ({id, label, icon, active, set}) => (
    <button onClick={() => set(id)} className={`w-full flex items-center gap-5 p-5 rounded-2xl transition-all font-black uppercase text-[10px] tracking-[0.2em] relative group ${active === id ? 'bg-black text-white shadow-2xl' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}>
        <span className={`${active === id ? 'text-[#FF8C00]' : 'text-gray-400 group-hover:text-black'}`}>{icon}</span>
        {label}
        {active === id && <div className="absolute left-0 w-1.5 h-6 bg-[#FF8C00] rounded-r-full"></div>}
    </button>
);

const KPICard = ({title, val, icon, trend, color="text-gray-900"}) => (
    <div className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-500 text-left">
        <div className="h-14 w-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#FF8C00] mb-8">{icon}</div>
        <div>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
                <span className="text-[8px] font-black uppercase tracking-widest text-green-500">{trend}</span>
            </div>
            <p className={`text-3xl font-black italic tracking-tighter ${color}`}>{val}</p>
        </div>
    </div>
);

const ChartBox = ({title, children}) => (
    <div className="bg-white p-12 rounded-[4rem] border border-gray-50 shadow-sm text-left relative overflow-hidden group">
        <h3 className="font-black uppercase text-xs tracking-[0.3em] text-gray-400 mb-12 flex items-center gap-4 relative z-10 italic">
            <span className="h-1 w-8 bg-[#FF8C00]"></span> {title}
        </h3>
        <div className="relative z-10">{children}</div>
    </div>
);

const StatMini = ({title, val}) => (
    <div className="p-6 bg-gray-50 rounded-[2rem] text-center border border-gray-100/50 hover:bg-white transition-all">
        <p className="text-2xl font-black text-gray-900 tracking-tighter">{val || 0}</p>
        <p className="text-[9px] font-black uppercase text-gray-400 mt-1 tracking-widest">{title}</p>
    </div>
);

export default Analytics;
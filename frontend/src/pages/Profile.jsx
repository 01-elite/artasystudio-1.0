import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Grid, Heart, Eye, Loader2, Sparkles, ChevronRight, CheckCircle2, Bookmark, Settings2, X, MapPin
} from 'lucide-react';

const Profile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [loggedInUser, setLoggedInUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [profileUser, setProfileUser] = useState(null);
    const [allArt, setAllArt] = useState([]);
    const [likedPosts, setLikedPosts] = useState([]);
    const [activeTab, setActiveTab] = useState('posts');
    const [loading, setLoading] = useState(true);

    const [showJourney, setShowJourney] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [step, setStep] = useState(1);
    
    const [formData, setFormData] = useState({
        username: loggedInUser?.username || '',
        phone: loggedInUser?.address?.phone || '',
        street: loggedInUser?.address?.street || '',
        city: loggedInUser?.address?.city || '',
        state: loggedInUser?.address?.state || '',
        pincode: loggedInUser?.address?.pincode || '',
        categories: loggedInUser?.categoryPreferences || [],
        role: loggedInUser?.role || 'user'
    });

    const isOwnProfile = !userId || userId === loggedInUser?._id;

    const fetchProfileData = async () => {
        const targetId = userId || loggedInUser?._id;
        if (!targetId) return;
        try {
            const artRes = await axios.get(`http://localhost:5001/api/art/user/${targetId}`);
            setAllArt(artRes.data);
            const likedRes = await axios.get(`http://localhost:5001/api/auth/liked-details/${targetId}`);
            setLikedPosts(likedRes.data);
            if (isOwnProfile) setProfileUser(loggedInUser);
            else setProfileUser({ name: "Artist", ...artRes.data[0]?.creator });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProfileData(); }, [userId, loggedInUser]);

    const handleCategoryToggle = (cat) => {
        const current = formData.categories;
        setFormData({ ...formData, categories: current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat] });
    };

    const handleFinish = async () => {
        try {
            // Validate username is not empty
            if (!formData.username || formData.username.trim() === '') {
                return alert("⚠️ Username is required!");
            }

            const payload = {
                username: formData.username,
                role: formData.role,
                categoryPreferences: formData.categories,
                address: { 
                    phone: formData.phone || '',
                    street: formData.street || '',
                    city: formData.city || '',
                    state: formData.state || '',
                    pincode: formData.pincode || ''
                }
            };

            console.log("Sending payload:", payload);
            console.log("User ID:", loggedInUser._id);

            const { data } = await axios.put(`http://localhost:5001/api/auth/update-address/${loggedInUser._id}`, payload);
            
            console.log("Response data:", data);
            
            localStorage.setItem("user", JSON.stringify(data));
            setLoggedInUser(data); 
            setProfileUser(data);
            setShowJourney(false);
            setIsEditing(false);
            setStep(1);
            alert("✅ Profile & Shipping Address Updated Successfully!");
            
            if (payload.role !== loggedInUser.role) {
                window.location.reload();
            }
        } catch (err) {
            console.error("Update Error Details:", err);
            const errorMsg = err.response?.data?.message || err.message || "Update failed";
            alert(`❌ Error: ${errorMsg}`);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-[#FF8C00]" /></div>;

    return (
        <div className="max-w-6xl mx-auto pt-10 px-6 font-sans text-left text-black">
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row items-start gap-10 mb-6">
                <div className="w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center text-4xl font-black text-[#FF8C00] border-4 border-white shadow-lg shrink-0">
                    {profileUser?.name?.[0]}
                </div>
                <div className="flex-1 w-full">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="text-4xl font-light">{profileUser?.name} {profileUser?.username && <CheckCircle2 className="inline text-blue-500 ml-2" size={20}/>}</h2>
                        {isOwnProfile && <button onClick={() => {setIsEditing(true); setShowJourney(true); setStep(1)}} className="flex items-center gap-2 px-6 py-2 bg-gray-50 border rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 transition-all"><Settings2 size={14}/> Edit Profile</button>}
                    </div>
                    <p className="text-[#FF8C00] font-black text-[11px] uppercase tracking-[0.3em] mt-1">@{profileUser?.username || 'new_member'}</p>
                    <div className="mt-4 flex gap-2">
                        <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase text-gray-50">{profileUser?.role}</div>
                        {profileUser?.address?.city && <div className="px-3 py-1 bg-blue-50 rounded-full text-[10px] font-black uppercase text-blue-500 flex items-center gap-1"><MapPin size={10}/> {profileUser.address.city}</div>}
                    </div>
                </div>
            </div>

            {/* --- JOURNEY OVERLAY --- */}
            {showJourney && (
                <div className="fixed inset-0 z-[500] bg-white/95 backdrop-blur-md flex items-center justify-center p-6 text-left">
                    <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 space-y-8 relative text-black">
                        <button onClick={() => setShowJourney(false)} className="absolute top-8 right-8 text-gray-300 hover:text-red-500"><X size={24}/></button>
                        
                        <div className="text-center">
                            <h2 className="text-3xl font-black">{isEditing ? "Edit Profile" : `Step ${step} of 4`}</h2>
                            <div className="h-1.5 w-full bg-gray-100 mt-4 rounded-full overflow-hidden">
                                <div className="h-full bg-[#FF8C00] transition-all" style={{width: `${(step/4)*100}%`}} />
                            </div>
                        </div>

                        {step === 1 && (
                            <div className="space-y-4">
                                <input className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                                <input className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                <button onClick={() => setStep(2)} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs">Continue to Shipping</button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Shipping Address</p>
                                <input className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Street / House No" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="City" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                    <input className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="Pincode" value={formData.pincode} onChange={e => setFormData({...formData, pincode: e.target.value})} />
                                </div>
                                <input className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" placeholder="State" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} />
                                <div className="flex gap-4">
                                    <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 py-5 rounded-2xl font-black uppercase text-xs">Back</button>
                                    <button onClick={() => setStep(3)} className="flex-[2] bg-black text-white py-5 rounded-2xl font-black uppercase text-xs">Next Step</button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase text-gray-400 text-center tracking-widest">Select Interests</p>
                                <div className="flex flex-wrap gap-2 justify-center max-h-[300px] overflow-y-auto p-2 border border-gray-50 rounded-2xl">
                                    {[
                                        'Colour drawing', 'Sketching', 'Charcoal drawing', 'Acrylic painting', 
                                        'Oil Painting', 'Watercolour Art', 'Mandala Art', 'Anime & Manga', 
                                        'Pottery & Ceramics', 'Calligraphy', 'Canvas Print', 'Portrait Sketch', 
                                        'Abstract Expressionism', 'Pop Art'
                                    ].map(cat => (
                                        <button 
                                            key={cat} 
                                            onClick={() => handleCategoryToggle(cat)} 
                                            className={`px-4 py-2 rounded-full text-[9px] font-black uppercase border transition-all ${formData.categories.includes(cat) ? 'bg-[#FF8C00] text-white border-[#FF8C00]' : 'border-gray-200 text-gray-400'}`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setStep(2)} className="flex-1 bg-gray-100 py-5 rounded-2xl font-black uppercase text-xs">Back</button>
                                    <button onClick={() => setStep(4)} className="flex-[2] bg-black text-white py-5 rounded-2xl font-black uppercase text-xs">Almost There</button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setFormData({...formData, role: 'user'})} className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest ${formData.role === 'user' ? 'border-[#FF8C00] bg-orange-50 text-[#FF8C00]' : 'border-gray-50 text-gray-400'}`}>Collector</button>
                                    <button onClick={() => setFormData({...formData, role: 'creator'})} className={`p-4 rounded-2xl border-2 font-black uppercase text-[10px] tracking-widest ${formData.role === 'creator' ? 'border-[#FF8C00] bg-orange-50 text-[#FF8C00]' : 'border-gray-50 text-gray-400'}`}>Artist</button>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setStep(3)} className="flex-1 bg-gray-100 py-5 rounded-2xl font-black uppercase text-xs">Back</button>
                                    <button onClick={handleFinish} className="flex-[2] bg-[#FF8C00] text-white py-5 rounded-2xl font-black uppercase text-xs shadow-xl">{isEditing ? "Save Profile" : "Finalize Studio"}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TABS & GRID --- */}
            <div className="flex justify-center gap-12 border-t pt-4 mb-10 text-[10px] font-black uppercase tracking-widest">
                <button onClick={() => setActiveTab('posts')} className={activeTab === 'posts' ? 'text-black border-t-2 border-black' : 'text-gray-300'}><Grid className="inline mr-2" size={14}/> Studio Gallery</button>
                <button onClick={() => setActiveTab('liked')} className={activeTab === 'liked' ? 'text-red-500 border-t-2 border-red-500' : 'text-gray-300'}><Heart className="inline mr-2" size={14}/> Liked Art</button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-20">
                {(activeTab === 'posts' ? allArt : likedPosts).map(post => (
                    <div key={post._id} className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border relative group shadow-sm">
                        <img src={post.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Profile;
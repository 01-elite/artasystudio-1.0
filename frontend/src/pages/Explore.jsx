import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart, X, Sparkles, Clock, ShoppingBag,
    Zap, Share2, MoreHorizontal, CheckCircle2, User, Gavel, Search,
    MessageCircle, ChevronDown, Send, Bot
} from 'lucide-react';

const Explore = () => {
    const navigate = useNavigate();
    
    // -- STATE --
    const [artworks, setArtworks] = useState([]);
    const [selectedArt, setSelectedArt] = useState(null);
    const [likedItems, setLikedItems] = useState(new Set());
    const [timeLeftMap, setTimeLeftMap] = useState({});
    const [bidAmount, setBidAmount] = useState("");
    const [showBidModal, setShowBidModal] = useState(false);
    const [recommendedForSelected, setRecommendedForSelected] = useState([]); 
    const [behavioralRecs, setBehavioralRecs] = useState([]); 
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("All");
    const [maxPrice, setMaxPrice] = useState(200000);
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
    const userPrefs = user?.categoryPreferences || [];

    // -- CHATBOT STATE --
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [chat, setChat] = useState([]);
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);

    // -- DATA FETCH --
    const fetchData = async () => {
        try {
            const res = await axios.get("http://localhost:5001/api/art/explore");
            setArtworks(res.data);
            syncCartWithBids(res.data);
            if (user?.likedArt) setLikedItems(new Set(user.likedArt));
            const userIdParam = user?._id ? `?userId=${user._id}` : '';
            if (res.data.length > 0) {
                const aiRes = await axios.get(`http://localhost:5001/api/art/recommend/${res.data[0]._id}${userIdParam}`);
                setBehavioralRecs(aiRes.data);
            }
        } catch (err) { console.error("Database connection failed"); }
    };

    const syncCartWithBids = (latestArt) => {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        if (cart.length === 0) return;
        const updatedCart = cart.filter(item => {
            if (!item.isAuction) return true;
            const freshData = latestArt.find(a => a._id === item._id);
            if (freshData) {
                const dbBidder = freshData.highestBidder ? String(freshData.highestBidder) : null;
                const currentUserId = user._id ? String(user._id) : null;
                if (dbBidder && dbBidder !== currentUserId) return false;
                item.price = freshData.highestBid || freshData.price;
            }
            return true;
        });
        localStorage.setItem('cart', JSON.stringify(updatedCart));
    };

    // -- HANDLERS --
    const handleArtClick = async (art) => {
        setSelectedArt(art);
        const userIdParam = user?._id ? `?userId=${user._id}` : '';
        try {
            if (user?._id && art?._id) {
                await axios.put(`http://localhost:5001/api/art/track-view`, { userId: user._id, artId: art._id });
            }
            const aiRes = await axios.get(`http://localhost:5001/api/art/recommend/${art._id}${userIdParam}`);
            setBehavioralRecs(aiRes.data);
        } catch (err) { console.error("AI tracking failed", err); }
    };

    const handlePlaceBid = async () => {
        const currentPrice = selectedArt.highestBid || selectedArt.price;
        const newBid = Number(bidAmount);
        if (newBid <= currentPrice) return alert(`Bid higher than ₹${currentPrice}`);
        try {
            await axios.put(`http://localhost:5001/api/art/bid/${selectedArt._id}`, { userId: user._id, amount: newBid });
            const aiRes = await axios.get(`http://localhost:5001/api/art/recommend/${selectedArt._id}?userId=${user._id}`);
            setBehavioralRecs(aiRes.data);
            setArtworks(prev => prev.map(art => art._id === selectedArt._id ? { ...art, highestBid: newBid, highestBidder: user._id } : art));
            setShowBidModal(false); setBidAmount(""); setSelectedArt(null); alert("Bid Placed Successfully!");
        } catch (err) { alert("Bid failed"); }
    };

   const addToCart = (art, redirect = false) => {
    // ❌ BLOCK auction items completely
    if (art.isAuction) {
        alert("❌ This artwork is under auction. You can only place bids.");
        return;
    }

    if (art.isSold) return;

    const finalPrice = art.highestBid || art.price;
    const cart = JSON.parse(localStorage.getItem('cart')) || [];

    const cleanCart = cart.filter(item => item._id !== art._id);

    const cartItem = {
        ...art,
        price: finalPrice,
        cartId: Date.now(),
        quantity: 1
    };

    localStorage.setItem('cart', JSON.stringify([...cleanCart, cartItem]));
    window.dispatchEvent(new Event('storage'));

    if (redirect) navigate('/cart');
};

    const toggleLike = async (e, artId) => {
        e.stopPropagation();
        if (!user?._id) return alert("Login to like!");
        try {
            const res = await axios.put(`http://localhost:5001/api/auth/like-art`, { userId: user._id, artId });
            const newLikes = new Set(likedItems);
            likedItems.has(artId) ? newLikes.delete(artId) : newLikes.add(artId);
            setLikedItems(newLikes);
            localStorage.setItem('user', JSON.stringify({ ...user, likedArt: res.data.likedArt }));
            const aiRes = await axios.get(`http://localhost:5001/api/art/recommend/${artId}?userId=${user._id}`);
            setBehavioralRecs(aiRes.data);
        } catch (err) { console.error("Like failed"); }
    };

    const sendChatMessage = async () => {
        if (!message.trim()) return;
        const userMsg = { type: "user", text: message };
        setChat((prev) => [...prev, userMsg]);
        setLoading(true); setMessage("");
        try {
            const res = await fetch("http://localhost:5001/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, userId: user?._id })
            });
            const data = await res.json();
            const botMsg = {
                type: "bot",
                data: data.reply,
                dataType: data.type || (Array.isArray(data.reply) ? "artworks" : "text")
            };
            setChat((prev) => [...prev, botMsg]);
        } catch (err) { setChat((prev) => [...prev, { type: "bot", data: "Something went wrong 😢", dataType: "text" }]); }
        setLoading(false);
    };

    // -- EFFECTS --
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat, loading, isChatOpen]);

    useEffect(() => {
        const fetchModalRecommendations = async () => {
            if (selectedArt?._id) {
                try {
                    const userIdParam = user?._id ? `?userId=${user._id}` : '';
                    const res = await axios.get(`http://localhost:5001/api/art/recommend/${selectedArt._id}${userIdParam}`);
                    setRecommendedForSelected(res.data);
                } catch (err) { console.error("Failed fetch", err); }
            } else { setRecommendedForSelected([]); }
        };
        fetchModalRecommendations();
    }, [selectedArt]);

    useEffect(() => {
        const timer = setInterval(() => {
            const newTimes = {};
            artworks.forEach(art => {
                if (art.isAuction && art.auctionEnd) {
                    const dist = new Date(art.auctionEnd).getTime() - new Date().getTime();
                    if (dist <= 0) newTimes[art._id] = "EXPIRED";
                    else {
                        const h = Math.floor(dist / (1000 * 60 * 60));
                        const m = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
                        const s = Math.floor((dist % (1000 * 60)) / 1000);
                        newTimes[art._id] = `${h}h ${m}m ${s}s`;
                    }
                }
            });
            setTimeLeftMap(newTimes);
        }, 1000);
        return () => clearInterval(timer);
    }, [artworks]);

    // -- UI COMPONENTS --
    const TypingText = ({ text }) => {
        const [displayed, setDisplayed] = useState("");
        useEffect(() => {
            let i = 0; const interval = setInterval(() => {
                setDisplayed((prev) => prev + text.charAt(i));
                i++; if (i >= text.length) clearInterval(interval);
            }, 20);
            return () => clearInterval(interval);
        }, [text]);
        return <p className="text-gray-200 text-sm whitespace-pre-line">{displayed}</p>;
    };

    const ArtCard = ({ art, isAuction, isGrid = false }) => (
        <div className={`${!isGrid ? 'w-[320px] md:w-[380px] flex-shrink-0' : 'w-full'} group bg-white border border-zinc-100 rounded-[2.5rem] p-6 hover:shadow-2xl transition-all relative text-left flex flex-col h-full`}>
            {isAuction && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-red-600 text-white px-3 py-1.5 rounded-full text-[9px] font-black flex items-center gap-1 shadow-lg">
                    <Clock size={10} /> {timeLeftMap[art._id] || "LIVE"}
                </div>
            )}
            {!art.isSold && (
                <button onClick={(e) => toggleLike(e, art._id)} className="absolute top-8 left-8 z-40 p-3 bg-white/90 backdrop-blur-md rounded-full shadow-md hover:scale-110">
                    <Heart size={18} className={likedItems.has(art._id) ? "fill-red-500 text-red-500" : "text-zinc-400"} />
                </button>
            )}
            <div className="absolute top-8 right-8 z-40 bg-black/80 backdrop-blur-md text-white px-3 py-2 rounded-full text-[8px] font-black uppercase shadow-md">{art.category}</div>
            <div className="aspect-square w-full rounded-[1.8rem] overflow-hidden mb-6 bg-zinc-50 cursor-pointer relative" onClick={() => handleArtClick(art)}>
                <img src={art.image} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" alt="" />
                {art.isSold && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-white/70 backdrop-blur-sm text-red-600 px-4 py-2 rounded-full font-black text-[10px] uppercase">SOLD</div>}
            </div>
            <div className="space-y-4 flex-grow flex flex-col">
                <div>
                    {art.aiScore > 0 && <div className="flex items-center gap-1 mb-1"><Sparkles size={10} className="text-[#FF8C00] fill-[#FF8C00]" /><span className="text-[8px] font-black text-[#FF8C00] uppercase">AI Top Pick</span></div>}
                    <h3 className="text-xl font-black uppercase text-zinc-900 truncate mb-1">{art.title}</h3>
                    <p className="text-[11px] text-zinc-400 font-bold uppercase mb-1">{art.creator?.name || "ArtVista Artist"}</p>
                    <p className="text-[11px] text-zinc-400 font-medium italic line-clamp-2 h-8 leading-relaxed">{art.description}</p>
                </div>
                <div className="flex justify-between items-center pt-5 border-t border-zinc-50 mt-auto">
                    <div>
                        <p className="text-[9px] font-black text-zinc-300 uppercase">{isAuction ? 'High Bid' : 'Price'}</p>
                        <p className={`text-2xl font-black ${isAuction ? 'text-red-600' : 'text-zinc-900'}`}>₹{(art.highestBid || art.price).toLocaleString()}</p>
                    </div>
                    <button onClick={() => { 
    handleArtClick(art); 
    if (isAuction && timeLeftMap[art._id] !== "EXPIRED") {
        setShowBidModal(true);
    }
}} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg ${isAuction ? 'bg-red-600 text-white' : 'bg-black text-white'}`}>
                        {isAuction && timeLeftMap[art._id] !== "EXPIRED" ? 'Place Bid' : 'View Piece'}
                    </button>
                </div>
            </div>
        </div>
    );

    const liveAuctions = artworks.filter(a => a.isAuction && !a.isSold && timeLeftMap[a._id] !== "EXPIRED");
    const recommendedArt = artworks.filter(art => !art.isSold && (!art.isAuction || timeLeftMap[art._id] === "EXPIRED") && userPrefs.includes(art.category));
    const publicStudio = artworks.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || (a.creator?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === "All" || a.category === filterCategory;
        const matchesPrice = (a.highestBid || a.price) <= maxPrice;
        return !a.isSold && (!a.isAuction || timeLeftMap[a._id] === "EXPIRED") && matchesSearch && matchesCategory && matchesPrice;
    });
    const museumArchive = artworks.filter(a => a.isSold);

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 bg-white min-h-screen font-sans text-left overflow-x-hidden relative">
            
            {/* HERO */}
            <div className="relative mb-20 mt-4 overflow-hidden rounded-[3.5rem] bg-[#050505] py-20 px-12 md:px-24 text-white shadow-2xl border-b-[10px] border-[#FF8C00]">
                <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-5 gap-16 items-center">
                    <div className="lg:col-span-3">
                        <div className="flex items-center gap-3 mb-8"><Sparkles className="text-[#FF8C00]" size={20} /><span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FF8C00]">Premier Art Exchange</span></div>
                        <h1 className="text-7xl md:text-[9.5rem] font-black leading-[0.8] mb-12 tracking-tighter uppercase italic">ARTVISTA <br /> <span className="text-[#FF8C00]">STUDIO.</span></h1>
                        <p className="text-zinc-400 text-lg md:text-2xl font-medium max-w-2xl leading-tight">Verified provenance and worldwide logistics.</p>
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-2 gap-y-16 pl-16 py-4 text-center border-l border-white/5">
                        <div><p className="text-6xl font-black">12.4K</p><p className="text-[10px] font-black uppercase tracking-widest text-[#FF8C00]">Collectors</p></div>
                        <div><p className="text-6xl font-black">450+</p><p className="text-[10px] font-black uppercase tracking-widest text-[#FF8C00]">Artists</p></div>
                        <div><p className="text-6xl font-black">100%</p><p className="text-[10px] font-black uppercase tracking-widest text-[#FF8C00]">Insured</p></div>
                        <div><p className="text-6xl font-black">24/7</p><p className="text-[10px] font-black uppercase tracking-widest text-[#FF8C00]">Support</p></div>
                    </div>
                </div>
            </div>

            {/* SECTIONS */}
            {liveAuctions.length > 0 && (
                <div className="mb-24 px-4">
                    <h2 className="text-2xl font-black uppercase italic text-red-600 mb-10 flex items-center gap-3"><div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" /> Live Auction Booth</h2>
                    <div className="flex overflow-x-auto gap-8 pb-10 no-scrollbar snap-x">{liveAuctions.map(art => <ArtCard key={art._id} art={art} isAuction={true} />)}</div>
                </div>
            )}

            {recommendedArt.length > 0 && (
                <div className="mb-24 px-4">
                    <h2 className="text-2xl font-black uppercase italic text-zinc-900 mb-10">Based on Your Interests</h2>
                    <div className="flex overflow-x-auto gap-8 pb-10 no-scrollbar snap-x">{recommendedArt.map(art => <ArtCard key={art._id} art={art} isAuction={false} />)}</div>
                </div>
            )}

            {/* AI RECS */}
            <div className="mb-24 px-4">
                <h2 className="text-2xl font-black uppercase italic text-zinc-900 mb-10 flex items-center gap-3"><Sparkles className="text-[#FF8C00]" size={24} /> Recommended for you</h2>
                {behavioralRecs.length > 0 ? (
                    <div className="flex overflow-x-auto gap-8 pb-10 no-scrollbar snap-x">{behavioralRecs.map(art => <ArtCard key={art._id} art={art} isAuction={false} />)}</div>
                ) : ( <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-zinc-100 rounded-[2.5rem] text-zinc-300 font-black uppercase text-xs">Interact with art to train AI...</div> )}
            </div>

            {/* GALLERY */}
            <div className="bg-[#fdf4f0] -mx-8 px-10 py-24 rounded-[4rem] border-y border-zinc-100 mb-24 shadow-inner">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8 px-4">
                    <h2 className="text-3xl font-black uppercase italic border-l-8 border-[#FF8C00] pl-6 text-black">Public Studio</h2>
                    <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-[2rem] shadow-xl">
                        <div className="flex items-center gap-3 px-5 py-3 bg-zinc-50 rounded-full min-w-[280px]">
                            <Search size={16} className="text-zinc-400" />
                            <input type="text" placeholder="Search..." className="bg-transparent outline-none text-xs font-bold w-full text-black" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <select className="px-5 py-3 bg-zinc-50 rounded-full text-xs font-black uppercase outline-none text-black" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="All">All Categories</option><option value="Sketching">Sketching</option><option value="Oil Painting">Oil Painting</option><option value="Anime & Manga">Anime & Manga</option>
                        </select>
                        <div className="flex items-center gap-4 px-6 py-2 bg-zinc-50 rounded-full">
                            <span className="text-[9px] font-black uppercase text-zinc-400">Max: ₹{maxPrice.toLocaleString()}</span>
                            <input type="range" min="0" max="200000" className="w-32 accent-[#FF8C00]" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 px-4">{publicStudio.map(art => <ArtCard key={art._id} art={art} isAuction={false} isGrid={true} />)}</div>
            </div>

            {museumArchive.length > 0 && (
                <div className="px-4 pb-24">
                    <h2 className="text-3xl font-black uppercase italic text-zinc-400 mb-16 flex items-center gap-4"><div className="w-12 h-[2px] bg-zinc-300" /> Museum Archive</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">{museumArchive.map(art => <ArtCard key={art._id} art={art} isAuction={false} isGrid={true} />)}</div>
                </div>
            )}

            {/* MODALS */}
            {showBidModal && selectedArt && (
                <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-black text-center">
                    <div className="bg-white max-w-md w-full rounded-[2.5rem] p-10 space-y-8 relative">
                        <button onClick={() => {setShowBidModal(false); setBidAmount("");}} className="absolute top-8 right-8 text-zinc-300 hover:text-black"><X/></button>
                        <Gavel className="mx-auto text-red-600" size={48} /><h2 className="text-3xl font-black uppercase tracking-tight">Bid Registry</h2>
                        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100"><p className="text-4xl font-black text-red-600">₹{(selectedArt.highestBid || selectedArt.price).toLocaleString()}</p></div>
                        <input type="number" className="w-full p-5 bg-zinc-100 rounded-2xl outline-none font-black text-xl text-center" value={bidAmount} placeholder="Enter Higher Amount" onChange={(e) => setBidAmount(e.target.value)} />
                        <button onClick={handlePlaceBid} className="w-full bg-red-600 text-white py-6 rounded-2xl font-black uppercase text-xs shadow-xl">Update DB Registry</button>
                    </div>
                </div>
            )}

            {selectedArt && !showBidModal && (
                <div className="fixed inset-0 z-[100] bg-zinc-950/98 backdrop-blur-2xl flex items-center justify-center p-4 text-left text-black">
                    <button onClick={() => setSelectedArt(null)} className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors"><X size={48}/></button>
                    <div className="bg-white max-w-[1200px] w-full rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[80vh] shadow-2xl relative">
                        <div className="flex-1 bg-[#F5F5F7] flex items-center justify-center p-6 md:p-12 relative">
                            <img src={selectedArt.image} className="max-h-full max-w-full object-contain rounded-2xl" alt="" />
                            {selectedArt.isSold && <div className="absolute top-8 left-8 bg-white/70 text-red-600 px-6 py-2 rounded-full font-black text-xs uppercase">PRIVATE ASSET</div>}
                        </div>
                        <div className="w-full md:w-[480px] bg-white flex flex-col border-l border-zinc-100 overflow-y-auto">
                            <div className="p-8 border-b border-zinc-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center text-white font-bold text-lg">{selectedArt.creator?.name?.[0]}</div>
                                    <div><p className="text-sm font-black uppercase text-zinc-900">{selectedArt.creator?.name}</p><p className="text-[10px] font-bold text-zinc-400 uppercase">Verified Artist</p></div>
                                </div>
                                {!selectedArt.isSold && <button onClick={(e) => toggleLike(e, selectedArt._id)} className="p-3 bg-zinc-50 rounded-full"><Heart size={20} className={likedItems.has(selectedArt._id) ? "fill-red-500 text-red-500" : "text-zinc-400"} /></button>}
                            </div>
                            <div className="p-10 flex-grow space-y-6">
                                <h3 className="text-5xl font-black uppercase tracking-tighter">{selectedArt.title}</h3>
                                <p className="text-zinc-500 font-medium italic text-lg leading-relaxed">{selectedArt.description}</p>
                            </div>
                            <div className="p-10 bg-zinc-50/50 border-t border-zinc-100 mt-auto">
                                <div className="mb-8"><p className="text-6xl font-black tracking-tighter">₹{(selectedArt.highestBid || selectedArt.price).toLocaleString()}</p></div>
                                {selectedArt.isAuction && timeLeftMap[selectedArt._id] !== "EXPIRED" ? (
    <button 
        onClick={() => setShowBidModal(true)}
        className="w-full bg-red-600 text-white py-6 rounded-2xl font-black text-sm uppercase shadow-xl"
    >
        Place Bid
    </button>
) : !selectedArt.isSold ? (
    <button 
        onClick={() => addToCart(selectedArt, true)}
        className="w-full bg-[#FF8C00] text-white py-6 rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-[#e67e00]"
    >
        Purchase Piece
    </button>
) : (
    <div className="w-full bg-zinc-900 text-zinc-400 py-6 rounded-2xl font-black text-center uppercase text-[10px]">
        Registry Asset
    </div>
)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CHATBOT */}
            <div className="fixed bottom-8 right-8 z-[1000] flex flex-col items-end">
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="w-[360px] md:w-[420px] h-[550px] bg-[#0A0A0A] rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col overflow-hidden mb-6" >
                            <div className="p-6 bg-gradient-to-r from-orange-600 to-orange-400 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center border border-white/20">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5"/><circle cx="9" cy="10" r="1.5" fill="white"/><circle cx="15" cy="10" r="1.5" fill="white"/><path d="M8 15C8 15 9.5 17 12 17C14.5 17 16 15 16 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                    </div>
                                    <div><h4 className="text-white font-black uppercase text-[12px] tracking-widest leading-none">ArtVista AI</h4><span className="text-black font-black uppercase text-[8px] tracking-tighter opacity-70">NexaCrft Studio</span></div>
                                </div>
                                <button onClick={() => setIsChatOpen(false)} className="text-black/50 hover:text-black transition-colors"><ChevronDown size={24}/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-[#0A0A0A]">
                                {chat.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center px-10">
                                        <Sparkles className="text-orange-500 mb-4" size={40} /><p className="text-white font-black uppercase text-xs tracking-widest mb-2">Welcome to the Studio</p><p className="text-zinc-500 text-[10px] uppercase font-bold tracking-tighter">Ask me about anime art or pricing.</p>
                                    </div>
                                )}
                                {chat.map((msg, index) => (
                                    <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-medium leading-relaxed ${msg.type === "user" ? "bg-orange-500 text-white rounded-br-none" : "bg-white/5 text-zinc-200 border border-white/10 rounded-bl-none"}`}>
                                           {msg.dataType === "artworks" ? (
                                                <div className="space-y-3">
                                                    {/* Intercept the string inside msg.data if it's the "N artworks found" message */}
                                                    <p className="text-[10px] font-black uppercase text-orange-500 mb-2 tracking-widest">
                                                        {Array.isArray(msg.data) ? (msg.data.length > 0 ? `${msg.data.length} Artworks Found ✨` : "No Artworks Found 😢") : (typeof msg.data === 'string' ? msg.data.replace(/^N\s/, `${chat[index-1]?.dataType === 'artworks' ? 'Results' : ''} `) : "Found results")}
                                                    </p>
                                                    {Array.isArray(msg.data) && (
                                                        <div className="grid gap-3">
                                                            {msg.data.map((art, i) => (
                                                                <div key={i} className="bg-black/50 rounded-xl p-2 border border-white/5 cursor-pointer hover:border-orange-500 transition-all hover:scale-[1.02]" onClick={() => { handleArtClick(art); setIsChatOpen(false); }}>
                                                                    <img src={art.image} className="w-full h-24 object-cover rounded-lg mb-2" alt=""/>
                                                                    <p className="font-black text-[9px] uppercase text-white truncate">{art.title}</p>
                                                                    <p className="text-orange-500 font-black text-xs">₹{art.price.toLocaleString()}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                msg.type === "bot" ? (
                                                    <TypingText text={typeof msg.data === 'string' ? msg.data.replace(/^N\s/, `${chat.filter(c => c.dataType === 'artworks').pop()?.data?.length || ''} `) : JSON.stringify(msg.data)} />
                                                ) : msg.text
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {loading && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" /><div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" /><div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" /></div>}
                                <div ref={chatEndRef} />
                            </div>

                            <div className="p-6 bg-white/5 border-t border-white/10 flex gap-3">
                                <input type="text" className="flex-1 bg-black border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:ring-2 ring-orange-500 text-white font-bold" placeholder="Ask AI kuch bhi..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} />
                                <button onClick={sendChatMessage} className="bg-orange-500 p-3 rounded-2xl text-white hover:scale-105 active:scale-95 transition-all"><Send size={18}/></button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="relative group">
                    <div className="absolute right-20 top-1/2 -translate-y-1/2 px-4 py-2 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2 opacity-0 group-hover:opacity-100 transition-all shadow-xl border border-white/10 pointer-events-none translate-x-4 group-hover:translate-x-0">Ask AI anything?</div>
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className="w-20 h-20 bg-[#0A0A0A] border-[6px] border-[#FF8C00] rounded-full flex flex-col items-center justify-center text-[#FF8C00] shadow-[0_10px_40px_rgba(255,140,0,0.4)] hover:scale-110 active:scale-90 overflow-hidden" >
                        <div className="absolute inset-0 bg-[#FF8C00] opacity-0 group-hover:opacity-10 transition-opacity" />
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] mb-1">Studio</span>
                        {isChatOpen ? <ChevronDown size={28}/> : ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M8 15C8 15 9.5 17 12 17C14.5 17 16 15 16 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg> )}
                        <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-1">Bot</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Explore;
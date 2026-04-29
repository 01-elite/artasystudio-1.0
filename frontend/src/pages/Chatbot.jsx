import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Mic, Trash2 } from "lucide-react"; // Extra icons

const Chatbot = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Get user from localStorage to personalize backend response
  const [user] = useState(JSON.parse(localStorage.getItem('user')) || {});

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const sendMessage = async (presetMessage = null) => {
    const finalMsg = presetMessage || message;
    if (!finalMsg.trim()) return;

    const userMsg = { type: "user", text: finalMsg };
    setChat((prev) => [...prev, userMsg]);
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pass userId so backend knows who is chatting
        body: JSON.stringify({ 
          message: finalMsg,
          userId: user?._id || null 
        })
      });

      const data = await res.json();
      setChat((prev) => [...prev, {
        type: "bot",
        data: data.reply,
        dataType: data.type || (Array.isArray(data.reply) ? "artworks" : "text")
      }]);
    } catch (err) {
      setChat((prev) => [...prev, { type: "bot", data: "Backend issue detected 🛠️", dataType: "text" }]);
    }
    setLoading(false);
  };

  const clearChat = () => setChat([]);

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white font-sans">
      
      {/* HEADER: Nexacrft Branding */}
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,140,0,0.5)]">
            <Sparkles size={20} className="text-black" />
          </div>
          <div>
            <h2 className="font-black uppercase text-xs tracking-widest">Nexacrft Assistant</h2>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">● Online</p>
          </div>
        </div>
        <button onClick={clearChat} className="text-zinc-500 hover:text-red-500 transition-colors">
          <Trash2 size={18} />
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {chat.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 italic text-sm">
            <p>Start a conversation, {user.name?.split(' ')[0] || 'Artist'}...</p>
          </div>
        )}

        {chat.map((msg, index) => (
          <motion.div key={index} initial={{ opacity: 0, x: msg.type === "user" ? 20 : -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                msg.type === "user" 
                ? "bg-orange-600 text-white rounded-br-none shadow-lg" 
                : "bg-zinc-900 border border-white/5 text-zinc-100 rounded-bl-none"
              }`}>
                {msg.dataType === "artworks" ? (
                  <div className="grid gap-4">
                    {msg.data.map((art, i) => (
                      <div key={i} className="bg-black/40 rounded-xl overflow-hidden border border-white/10">
                        <img src={art.image} className="w-full h-32 object-cover" alt="" />
                        <div className="p-3">
                          <p className="font-black uppercase text-[10px] truncate">{art.title}</p>
                          <p className="text-orange-400 font-bold text-xs mt-1">₹{art.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  msg.type === "bot" ? <TypingText text={msg.data} /> : <p className="text-sm">{msg.text}</p>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && <div className="text-[10px] uppercase font-black text-orange-500 animate-pulse">Assistant is searching...</div>}
        <div ref={chatEndRef} />
      </div>

      {/* QUICK SUGGESTIONS */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {["Latest Art", "Anime Style", "Budget Friendly"].map(tag => (
          <button 
            key={tag}
            onClick={() => sendMessage(tag)}
            className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase hover:bg-orange-500 transition-all"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* INPUT AREA */}
      <div className="p-4 bg-zinc-950 border-t border-white/5 flex items-center gap-3">
        <div className="flex-1 bg-zinc-900 rounded-2xl px-4 py-3 flex items-center gap-2 border border-white/5 focus-within:border-orange-500 transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent outline-none text-sm text-white"
            placeholder="Type your creative query..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Mic size={18} className="text-zinc-500 cursor-pointer hover:text-orange-500" />
        </div>
        <button onClick={() => sendMessage()} className="bg-orange-600 p-3 rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-orange-900/20">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

// 🔥 Typing animation
const TypingText = ({ text }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 15);
    return () => clearInterval(interval);
  }, [text]);
  return <p className="text-sm text-zinc-200 leading-relaxed">{displayed}</p>;
};

export default Chatbot;
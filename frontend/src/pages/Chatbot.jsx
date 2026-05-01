import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Mic, Trash2 } from "lucide-react";

const Chatbot = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const [user] = useState(JSON.parse(localStorage.getItem("user")) || {});
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async (presetMessage = null) => {
    const finalMsg = presetMessage || message;
    if (!finalMsg.trim()) return;

    const userMsg = {
      id: Date.now(),
      type: "user",
      text: finalMsg,
    };

    setChat((prev) => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMsg,
          userId: user?._id || null,
        }),
      });

      const data = await res.json();
      const fullText = data.reply || "No response";

      // ✅ Create empty bot message
      const botId = Date.now() + 1;

      setChat((prev) => [
        ...prev,
        {
          id: botId,
          type: "bot",
          text: "",
        },
      ]);

      // ✅ Typing animation inside state
      let i = 0;
      const interval = setInterval(() => {
        i++;

        setChat((prev) =>
          prev.map((msg) =>
            msg.id === botId
              ? { ...msg, text: fullText.slice(0, i) }
              : msg
          )
        );

        if (i >= fullText.length) {
          clearInterval(interval);
          setLoading(false);
        }
      }, 15);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: "bot",
          text: "Backend issue detected 🛠️",
        },
      ]);
      setLoading(false);
    }
  };

  const clearChat = () => setChat([]);

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A] text-white font-sans">

      {/* HEADER */}
      <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
            <Sparkles size={20} className="text-black" />
          </div>
          <div>
            <h2 className="font-black text-xs uppercase">Nexacrft Assistant</h2>
            <p className="text-[10px] text-green-500">● Online</p>
          </div>
        </div>
        <button onClick={clearChat}>
          <Trash2 size={18} />
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chat.length === 0 && (
          <p className="opacity-30 text-center">
            Start chatting, {user.name || "User"}...
          </p>
        )}

        {chat.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.type === "user" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div
              className={`flex ${
                msg.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`p-3 rounded-xl max-w-[75%] ${
                  msg.type === "user"
                    ? "bg-orange-600"
                    : "bg-zinc-900 border border-white/10"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
              </div>
            </div>
          </motion.div>
        ))}

        {loading && (
          <p className="text-xs text-orange-500 animate-pulse">
            Assistant is typing...
          </p>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* QUICK BUTTONS */}
      <div className="px-4 py-2 flex gap-2">
        {["Latest Art", "Anime Style", "Budget Friendly"].map((tag) => (
          <button
            key={tag}
            onClick={() => sendMessage(tag)}
            className="px-3 py-1 text-xs bg-white/10 rounded-full"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* INPUT */}
      <div className="p-4 flex gap-2 border-t border-white/10">
        <input
          type="text"
          className="flex-1 bg-zinc-900 px-4 py-2 rounded-xl outline-none"
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={() => sendMessage()}
          className="bg-orange-600 p-3 rounded-xl"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
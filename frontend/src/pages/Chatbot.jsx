import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const Chatbot = () => {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);

  // 🔽 Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  // 🔽 SEND MESSAGE
  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMsg = { type: "user", text: message };
    setChat((prev) => [...prev, userMsg]);

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await res.json();

      const botMsg = {
        type: "bot",
        data: data.reply,
        dataType: data.type || (Array.isArray(data.reply) ? "artworks" : "text")
      };

      setChat((prev) => [...prev, botMsg]);

    } catch (err) {
      setChat((prev) => [
        ...prev,
        {
          type: "bot",
          data: "Something went wrong 😢",
          dataType: "text"
        }
      ]);
    }

    setMessage("");
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">

      {/* HEADER */}
      <div className="p-4 text-xl font-bold flex items-center gap-2 border-b border-gray-700">
        🎨 AI Art Assistant
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {chat.map((msg, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >

            {/* USER */}
            {msg.type === "user" && (
              <div className="flex justify-end">
                <div className="bg-orange-500 text-white px-4 py-2 rounded-2xl max-w-xs shadow-lg">
                  {msg.text}
                </div>
              </div>
            )}

            {/* BOT */}
            {msg.type === "bot" && (
              <div className="flex items-start gap-3">

                {/* Avatar */}
                <div className="w-9 h-9 bg-orange-500 flex items-center justify-center rounded-full shadow-md">
                  🤖
                </div>

                <div className="bg-gray-800 p-4 rounded-2xl shadow-lg max-w-md w-full">

                  {/* ARTWORKS */}
                  {msg.dataType === "artworks" ? (
                    msg.data.length === 0 ? (
                      <p className="text-gray-400">No artworks found 😢</p>
                    ) : (
                      <div className="grid gap-4">
                        {msg.data.map((art, i) => (
                          <motion.div
                            key={i}
                            whileHover={{ scale: 1.03 }}
                            className="bg-gray-900 border border-gray-700 rounded-xl p-3 transition cursor-pointer"
                          >
                            <img
                              src={art.image}
                              alt={art.title}
                              className="w-full h-40 object-cover rounded-lg"
                            />

                            <h3 className="font-bold mt-2">{art.title}</h3>
                            <p className="text-sm text-gray-400">{art.category}</p>

                            <div className="flex justify-between mt-2">
                              <span className="text-orange-400 font-semibold">
                                ₹{art.price}
                              </span>
                              <span className="text-gray-400 text-sm">
                                ❤️ {art.likes}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )
                  ) : (
                    <TypingText text={msg.data} />
                  )}

                </div>
              </div>
            )}

          </motion.div>
        ))}

        {/* LOADING */}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400">
            <span className="animate-pulse">🤖 Typing...</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* INPUT */}
      <div className="p-4 bg-gray-900 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          className="flex-1 bg-gray-800 text-white border border-gray-600 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-orange-400"
          placeholder='Try: "cheap anime art"'
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />

        <button
          onClick={sendMessage}
          className="bg-orange-500 px-6 py-2 rounded-xl hover:bg-orange-600 transition shadow-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

// 🔥 Typing animation (RIA feel)
const TypingText = ({ text }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text.charAt(i));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return <p className="text-gray-200 whitespace-pre-line">{displayed}</p>;
};

export default Chatbot;
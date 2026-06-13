import { useState, useRef, useEffect } from "react";

const ACCENT = "#6C3FF5";
const BG = "#0A0F1E";
const SURFACE = "#141928";
const SURFACE2 = "#1E2640";
const TEXT = "#F0F4FF";
const MUTED = "#6B7A99";

const MODES = [
  { id: "chat", label: "💬 Chat" },
  { id: "image", label: "🎨 Image" },
];

const SUGGESTIONS = {
  chat: ["Explique-moi le machine learning", "Rédige un email professionnel", "Donne-moi une recette rapide"],
  image: ["Un paysage de montagne au coucher du soleil", "Un robot futuriste dans une ville néon", "Un chat astronaute dans l'espace"],
};

// ─── API CALLS ────────────────────────────────────────────────

// 🔒 Chat passe par notre backend Vercel — clé API jamais exposée
async function askNexa(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data.reply;
}

// 🎨 Images via Pollinations (gratuit, pas de clé)
async function generateImage(prompt) {
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=512&seed=${seed}&nologo=true`;
}

// ─── COMPONENTS ──────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: ACCENT,
          animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16, gap: 10, alignItems: "flex-end" }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: `linear-gradient(135deg, ${ACCENT}, #A855F7)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, fontWeight: 700, color: "#fff",
        }}>N</div>
      )}
      <div style={{
        maxWidth: "75%",
        background: isUser ? ACCENT : SURFACE2,
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: TEXT,
        border: isUser ? "none" : `1px solid rgba(108,63,245,0.15)`,
      }}>
        {msg.type === "image" ? (
          <div>
            <p style={{ color: MUTED, fontSize: 12, marginBottom: 10 }}>🎨 {msg.prompt}</p>
            {msg.loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: MUTED, fontSize: 13 }}>
                <TypingDots /> Génération en cours…
              </div>
            ) : (
              <img src={msg.url} alt={msg.prompt} style={{ width: "100%", borderRadius: 10, display: "block" }} />
            )}
          </div>
        ) : msg.loading ? <TypingDots /> : (
          <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ mode, onSuggest }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 20 }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: `linear-gradient(135deg, ${ACCENT}33, #A855F733)`,
        border: `1.5px solid ${ACCENT}55`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30,
      }}>
        {mode === "chat" ? "💬" : "🎨"}
      </div>
      <div style={{ textAlign: "center" }}>
        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
          {mode === "chat" ? "Posez votre question" : "Décrivez votre image"}
        </h3>
        <p style={{ color: MUTED, fontSize: 14 }}>
          {mode === "chat" ? "NEXA est prêt à vous répondre" : "NEXA va la créer pour vous"}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 360 }}>
        {SUGGESTIONS[mode].map((s) => (
          <button key={s} onClick={() => onSuggest(s)} style={{
            background: SURFACE2, border: `1px solid rgba(108,63,245,0.2)`,
            borderRadius: 10, padding: "10px 14px", color: TEXT, fontSize: 13,
            cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(108,63,245,0.2)"}
          >{s}</button>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (mode === "chat") {
      const userMsg = { role: "user", content: prompt };
      const history = [...messages, userMsg];
      setMessages([...history, { role: "assistant", loading: true }]);
      setLoading(true);
      try {
        const reply = await askNexa(history.map(m => ({ role: m.role, content: m.content })));
        setMessages([...history, { role: "assistant", content: reply }]);
      } catch (e) {
        setMessages([...history, { role: "assistant", content: `❌ ${e.message}` }]);
      }
      setLoading(false);
    } else {
      const imgMsg = { role: "assistant", type: "image", prompt, loading: true };
      setMessages(prev => [...prev, { role: "user", content: prompt }, imgMsg]);
      setLoading(true);
      try {
        const url = await generateImage(prompt);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...imgMsg, loading: false, url };
          return updated;
        });
      } catch {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "❌ Erreur lors de la génération." };
          return updated;
        });
      }
      setLoading(false);
    }
    inputRef.current?.focus();
  };

  const switchMode = (m) => { setMode(m); setMessages([]); setInput(""); };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: BG, color: TEXT, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)} }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${ACCENT}44;border-radius:2px}
        textarea{resize:none;outline:none;}
      `}</style>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid rgba(108,63,245,0.15)`, background: SURFACE, flexShrink: 0 }}>
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>
          NEX<span style={{ color: ACCENT }}>A</span>
        </span>
        <div style={{ display: "flex", background: SURFACE2, borderRadius: 10, padding: 4, gap: 4 }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => switchMode(m.id)} style={{
              padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: mode === m.id ? ACCENT : "transparent",
              color: mode === m.id ? "#fff" : MUTED,
              fontSize: 13, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
            }}>{m.label}</button>
          ))}
        </div>
        <div style={{ width: 80, display: "flex", justifyContent: "flex-end" }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", background: "#4ade80",
            boxShadow: "0 0 8px #4ade80", marginRight: 8,
          }} />
          <span style={{ color: MUTED, fontSize: 12 }}>En ligne</span>
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column" }}>
        {messages.length === 0
          ? <EmptyState mode={mode} onSuggest={handleSend} />
          : <>{messages.map((msg, i) => <Message key={i} msg={msg} />)}<div ref={bottomRef} /></>
        }
      </div>

      {/* INPUT */}
      <div style={{ padding: "14px 16px", borderTop: `1px solid rgba(108,63,245,0.12)`, background: SURFACE, flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: SURFACE2, borderRadius: 14, padding: "10px 14px", border: `1px solid rgba(108,63,245,0.2)` }}>
          <textarea
            ref={(el) => { inputRef.current = el; textareaRef.current = el; }}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={mode === "chat" ? "Posez votre question…" : "Décrivez l'image à générer…"}
            style={{ flex: 1, background: "transparent", border: "none", color: TEXT, fontSize: 14, fontFamily: "inherit", lineHeight: 1.5, minHeight: 22, maxHeight: 120 }}
          />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()} style={{
            width: 36, height: 36, borderRadius: 10, border: "none",
            background: loading || !input.trim() ? SURFACE : ACCENT,
            color: "#fff", fontSize: 18, cursor: loading || !input.trim() ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s",
          }}>↑</button>
        </div>
        <p style={{ textAlign: "center", color: MUTED, fontSize: 11, marginTop: 8 }}>
          {mode === "chat" ? "🔒 Chat sécurisé · Clé API côté serveur uniquement" : "🎨 Images par Pollinations AI · Gratuit"}
        </p>
      </div>
    </div>
  );
}

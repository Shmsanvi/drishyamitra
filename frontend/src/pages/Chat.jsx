import { useState, useRef, useEffect } from 'react';
import { chatAPI, photosAPI } from '../services/api';
import { Send, Bot, User, Trash2 } from 'lucide-react';
import API from '../services/api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    API.get('/chat/history').then(res => {
      if (res.data.length === 0) {
        setMessages([{ role: 'assistant', content: "Hi! I'm your Drishyamitra AI assistant. Ask me to find photos, search by person, count photos, list people, rename or delete!" }]);
      } else {
        setMessages(res.data);
      }
    }).catch(() => {
      setMessages([{ role: 'assistant', content: "Hi! I'm your Drishyamitra AI assistant. Ask me to find photos, search by person, count photos, list people, rename or delete!" }]);
    });
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const clearHistory = async () => {
    if (!window.confirm('Clear all chat history?')) return;
    await API.delete('/chat/clear');
    setMessages([{ role: 'assistant', content: "Chat cleared! How can I help you?" }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await chatAPI.sendMessage(userMsg);
      const data = res.data;
      setMessages(m => [...m, {
        role: 'assistant',
        content: data.message,
        photos: data.photos || []
      }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I had trouble with that request.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Chat</h1>
          <p className="text-gray-400 mt-1">Ask anything about your photos</p>
        </div>
        <button onClick={clearHistory} className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm">
          <Trash2 size={16} /> Clear History
        </button>
      </div>

      <div className="flex-1 bg-gray-900 rounded-2xl border border-gray-800 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-purple-600' : 'bg-gray-700'}`}>
                {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`max-w-lg flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                  {msg.content}
                </div>
                {msg.photos?.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {msg.photos.slice(0, 9).map(photo => (
                      <img key={photo.id} src={photosAPI.getFileUrl(photo.filename)}
                        className="w-24 h-24 object-cover rounded-xl" alt="" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-gray-800 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                      style={{animationDelay: `${i*0.15}s`}} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-3">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder='Try: "how many photos?" or "list all people"'
              className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 text-sm"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl transition-colors disabled:opacity-50">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

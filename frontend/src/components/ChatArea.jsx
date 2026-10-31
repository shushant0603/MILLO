import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  MoreVertical, 
  UserMinus, 
  ArrowLeft, 
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Phone,
  Video
} from 'lucide-react';

export default function ChatArea({
  currentUser,
  activeFriend,
  messages,
  isTyping,
  onSendMessage,
  onTyping,
  onRemoveFriend,
  onBack,
  onStartCall
}) {
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmUnfriend, setShowConfirmUnfriend] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Typing notification
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      if (onTyping) onTyping(false);
    }

    onSendMessage(inputText.trim());
    setInputText('');
  };

  const insertEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const formatMessageTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // If no chat selected, display empty state
  if (!activeFriend) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-10 h-10" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-100 mb-2">
          Select a conversation
        </h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Pick a friend from your chat list on the left to start messaging, or explore all users to make new friends!
        </p>

        <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
          <span>🔒 End-to-end user authenticated</span>
          <span>•</span>
          <span>⚡ Real-time Socket.io</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 px-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button on mobile */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md text-sm"
              style={{ backgroundColor: activeFriend.avatarColor || '#6366f1' }}
            >
              {activeFriend.name ? activeFriend.name[0].toUpperCase() : 'F'}
            </div>
            {activeFriend.isOnline && (
              <span
                title="Online"
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"
              />
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100 text-sm truncate">
              {activeFriend.name}
            </h3>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeFriend.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="text-[11px] text-slate-400">
                {activeFriend.isOnline ? 'Active now' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-1">
          {onStartCall && (
            <>
              <button
                type="button"
                onClick={() => onStartCall(activeFriend, false)}
                title="Start Audio Call"
                className="p-2 rounded-xl text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onStartCall(activeFriend, true)}
                title="Start Video Call"
                className="p-2 rounded-xl text-slate-300 hover:text-indigo-400 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Action Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl py-1 z-20">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowConfirmUnfriend(true);
                }}
                className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Remove Friend</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Confirmation Modal for Unfriend */}
      {showConfirmUnfriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-100 text-base mb-1">
              Remove {activeFriend.name}?
            </h4>
            <p className="text-xs text-slate-400 mb-5">
              You will no longer be able to message each other unless you reconnect as friends.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmUnfriend(false)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmUnfriend(false);
                  onRemoveFriend(activeFriend.id);
                }}
                className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Intro banner */}
        <div className="py-6 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center font-bold text-white text-lg shadow-md mb-2"
            style={{ backgroundColor: activeFriend.avatarColor || '#6366f1' }}
          >
            {activeFriend.name ? activeFriend.name[0].toUpperCase() : 'F'}
          </div>
          <h4 className="font-bold text-slate-200 text-sm">{activeFriend.name}</h4>
          <p className="text-xs text-slate-400">@{activeFriend.username}</p>
          {activeFriend.bio && (
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 italic">
              "{activeFriend.bio}"
            </p>
          )}
          <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            You are friends. Messages are encrypted & instant ⚡
          </div>
        </div>

        {/* Message items */}
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser?.id;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[78%] sm:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm break-words ${
                  isMe
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-xs'
                    : 'bg-slate-800 text-slate-100 rounded-bl-xs border border-slate-700/60'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {formatMessageTime(msg.timestamp)}
              </span>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pl-1">
            <div className="flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-700/50">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
            </div>
            <span className="text-[11px]">{activeFriend.name} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reaction Emojis */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 border-t border-slate-900 bg-slate-950">
        <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
          <Smile className="w-3 h-3" /> Quick:
        </span>
        {['👋', '👍', '❤️', '🔥', '😂', '🎉'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => insertEmoji(emoji)}
            className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs transition-colors cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-slate-800/80 bg-slate-900/90 backdrop-blur flex items-center gap-2"
      >
        <input
          type="text"
          placeholder={`Message ${activeFriend.name}...`}
          value={inputText}
          onChange={handleInputChange}
          className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}


import { useState } from 'react';
import { UserCheck, UserPlus, Clock, Check, X, MessageSquare, Loader2 } from 'lucide-react';

export default function UserCard({
  user,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  onStartChat
}) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (actionFn, ...args) => {
    try {
      setLoading(true);
      await actionFn(...args);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 transition-all duration-200 group">
      {/* User Info */}
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="relative shrink-0">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md text-base"
            style={{ backgroundColor: user.avatarColor || '#6366f1' }}
          >
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          {user.isOnline && (
            <span
              title="Online"
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm"
            />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100 text-sm truncate">
              {user.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">@{user.username}</p>
          {user.bio && (
            <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-xs mt-0.5">
              {user.bio}
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons based on status */}
      <div className="shrink-0 flex items-center gap-1.5">
        {loading ? (
          <div className="p-2">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <>
            {user.friendshipStatus === 'friends' && (
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserCheck className="w-3 h-3" />
                  Friends
                </span>
                <button
                  type="button"
                  onClick={() => onStartChat(user)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
                  title="Open Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            )}

            {user.friendshipStatus === 'pending_sent' && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-3 h-3" />
                  <span className="hidden sm:inline">Pending</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAction(onCancelRequest, user.requestId || user.id)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 text-xs font-medium transition-all cursor-pointer"
                  title="Cancel Request"
                >
                  Cancel
                </button>
              </div>
            )}

            {user.friendshipStatus === 'pending_received' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAction(onAcceptRequest, user.requestId || user.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
                  title="Accept Friend Request"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAction(onRejectRequest, user.requestId || user.id)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 text-xs transition-all cursor-pointer"
                  title="Decline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {user.friendshipStatus === 'none' && (
              <button
                type="button"
                onClick={() => handleAction(onSendRequest, user.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 active:scale-95 text-white text-xs font-medium transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Friend</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}


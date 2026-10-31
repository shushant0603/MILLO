import { useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  UserPlus, 
  Search, 
  LogOut, 
  Clock, 
  CheckCircle,
  Inbox
} from 'lucide-react';
import UserCard from './UserCard';

export default function Sidebar({
  currentUser,
  friends,
  allUsers,
  requests,
  activeFriend,
  onSelectFriend,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'explore' | 'requests'
  const [searchQuery, setSearchQuery] = useState('');

  const incomingCount = requests?.incoming?.length || 0;

  // Filtered lists based on search
  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
  });

  const filteredExploreUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
  });

  // Helper format timestamp
  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col h-full bg-slate-900 border-r border-slate-800 shrink-0">
      {/* Top Header: Current User Profile */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md text-base"
              style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
            >
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <span
              title="Online"
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"
            />
          </div>

          <div className="min-w-0">
            <h2 className="font-semibold text-slate-100 text-sm truncate">
              {currentUser?.name}
            </h2>
            <p className="text-xs text-slate-400 truncate">@{currentUser?.username}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/50">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/70 rounded-2xl border border-slate-800/80">
          {/* Chats / Friends Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('friends')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chats</span>
            {friends.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'friends' ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {friends.length}
              </span>
            )}
          </button>

          {/* Explore Users Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'explore'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users</span>
          </button>

          {/* Friend Requests Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`relative flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Requests</span>
            {incomingCount > 0 && (
              <span className="bg-pink-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {incomingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-slate-800/60">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'friends'
                ? 'Search friends...'
                : activeTab === 'explore'
                ? 'Search all users...'
                : 'Search requests...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* --- 1. CHATS / FRIENDS LIST --- */}
        {activeTab === 'friends' && (
          <>
            {filteredFriends.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/70 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <UserPlus className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200">
                  {friends.length === 0 ? 'No friends added yet' : 'No matching friends'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  {friends.length === 0
                    ? 'Go to the "Users" tab to discover registered users and send friend requests!'
                    : 'Try a different search term.'}
                </p>
                {friends.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('explore')}
                    className="mt-4 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Find Users
                  </button>
                )}
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = activeFriend?.id === friend.id;
                return (
                  <div
                    key={friend.id}
                    onClick={() => onSelectFriend(friend)}
                    className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-150 border ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/40 shadow-sm'
                        : 'bg-slate-900/40 hover:bg-slate-800/60 border-slate-800/60'
                    }`}
                  >
                    {/* Avatar & Online status */}
                    <div className="relative shrink-0">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm text-sm"
                        style={{ backgroundColor: friend.avatarColor || '#6366f1' }}
                      >
                        {friend.name ? friend.name[0].toUpperCase() : 'F'}
                      </div>
                      {friend.isOnline && (
                        <span
                          title="Online"
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900"
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-semibold text-slate-100 text-sm truncate">
                          {friend.name}
                        </span>
                        {friend.lastMessage && (
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {formatTime(friend.lastMessage.timestamp)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 truncate pr-2">
                          {friend.lastMessage ? (
                            friend.lastMessage.senderId === currentUser?.id ? (
                              <span>You: {friend.lastMessage.content}</span>
                            ) : (
                              friend.lastMessage.content
                            )
                          ) : (
                            <span className="text-indigo-400/80 italic text-[11px]">
                              Connected! Say hi 👋
                            </span>
                          )}
                        </p>

                        {friend.unreadCount > 0 && (
                          <span className="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                            {friend.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* --- 2. EXPLORE ALL USERS TAB --- */}
        {activeTab === 'explore' && (
          <div className="space-y-2">
            <div className="px-1 py-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Discover Users ({filteredExploreUsers.length})
              </span>
            </div>

            {filteredExploreUsers.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                No users found.
              </div>
            ) : (
              filteredExploreUsers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  onSendRequest={onSendRequest}
                  onAcceptRequest={onAcceptRequest}
                  onRejectRequest={onRejectRequest}
                  onCancelRequest={onCancelRequest}
                  onStartChat={(u) => {
                    onSelectFriend(u);
                    setActiveTab('friends');
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* --- 3. FRIEND REQUESTS TAB --- */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {/* Incoming Requests */}
            <div>
              <div className="px-1 py-1 flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Received ({requests.incoming?.length || 0})
                </span>
              </div>

              {!requests.incoming || requests.incoming.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 text-center text-xs text-slate-500">
                  No pending friend requests.
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.incoming.map((req) => (
                    <UserCard
                      key={req.id}
                      user={{
                        ...req.user,
                        friendshipStatus: 'pending_received',
                        requestId: req.id
                      }}
                      onAcceptRequest={onAcceptRequest}
                      onRejectRequest={onRejectRequest}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <div className="px-1 py-1 flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Sent Requests ({requests.outgoing?.length || 0})
                </span>
              </div>

              {!requests.outgoing || requests.outgoing.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850 text-center text-xs text-slate-500">
                  No outgoing requests pending.
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.outgoing.map((req) => (
                    <UserCard
                      key={req.id}
                      user={{
                        ...req.user,
                        friendshipStatus: 'pending_sent',
                        requestId: req.id
                      }}
                      onCancelRequest={onCancelRequest}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}


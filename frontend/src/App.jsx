import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  api, 
  getStoredToken, 
  getStoredUser, 
  setStoredToken, 
  setStoredUser 
} from './services/api';
import { getSocket, disconnectSocket } from './services/socket';
import AuthModal from './components/AuthModal';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import CallModal from './components/CallModal';
import { Bell, Check, Info } from 'lucide-react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [friends, setFriends] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [toast, setToast] = useState(null);

  // WebRTC Call State
  const [callState, setCallState] = useState({
    status: 'idle', // 'idle' | 'calling' | 'incoming' | 'connected'
    otherUser: null,
    isVideo: true,
    incomingSignal: null
  });
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const activeFriendRef = useRef(activeFriend);
  activeFriendRef.current = activeFriend;

  const peerConnectionRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const localStreamRef = useRef(null);
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  // Show temporary toast notification
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch all initial data
  const loadInitialData = useCallback(async () => {
    try {
      const [friendsData, usersData, requestsData] = await Promise.all([
        api.getFriends(),
        api.getAllUsers(),
        api.getRequests()
      ]);

      setFriends(friendsData);
      setAllUsers(usersData);
      setRequests(requestsData);
    } catch (err) {
      console.error('Failed to load chat data:', err);
    }
  }, []);

  // Verify current user session on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      api.getMe()
        .then((res) => {
          setCurrentUser(res.user);
          setStoredUser(res.user);
        })
        .catch(() => {
          handleLogout();
        });
    }
  }, []);

  // Clean up local media tracks
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  // End or reset active call
  const cleanupCall = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopLocalStream();
    pendingCandidatesRef.current = [];
    setCallState({
      status: 'idle',
      otherUser: null,
      isVideo: true,
      incomingSignal: null
    });
  }, [stopLocalStream]);

  // Set up socket and fetch data when currentUser changes
  useEffect(() => {
    if (!currentUser) return;

    loadInitialData();

    const socket = getSocket();
    if (!socket) return;

    // Real-time message receiver
    const handleReceiveMessage = (newMsg) => {
      const currentActive = activeFriendRef.current;

      if (currentActive && (newMsg.senderId === currentActive.id || newMsg.receiverId === currentActive.id)) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      } else {
        showToast('New message received', 'message');
      }

      setFriends((prevFriends) =>
        prevFriends.map((f) => {
          if (f.id === newMsg.senderId || f.id === newMsg.receiverId) {
            const isCurrentChat = currentActive?.id === f.id;
            return {
              ...f,
              lastMessage: {
                content: newMsg.content,
                timestamp: newMsg.timestamp,
                senderId: newMsg.senderId
              },
              unreadCount: isCurrentChat ? 0 : (f.unreadCount || 0) + 1
            };
          }
          return f;
        })
      );
    };

    // Real-time message sender acknowledgment
    const handleMessageSent = (sentMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });

      setFriends((prevFriends) =>
        prevFriends.map((f) => {
          if (f.id === sentMsg.receiverId) {
            return {
              ...f,
              lastMessage: {
                content: sentMsg.content,
                timestamp: sentMsg.timestamp,
                senderId: sentMsg.senderId
              }
            };
          }
          return f;
        })
      );
    };

    // User online status updates
    const handleUserStatusChange = ({ userId, isOnline }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === userId ? { ...f, isOnline } : f))
      );
      setAllUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isOnline } : u))
      );
      if (activeFriendRef.current?.id === userId) {
        setActiveFriend((prev) => (prev ? { ...prev, isOnline } : null));
      }
    };

    // Friend requests
    const handleFriendRequestReceived = ({ sender }) => {
      showToast(`${sender.name} sent you a friend request!`, 'request');
      loadInitialData();
    };

    const handleFriendRequestAccepted = ({ friend }) => {
      showToast(`You and ${friend.name} are now friends!`, 'friend');
      loadInitialData();
    };

    const handleFriendRequestUpdate = () => {
      loadInitialData();
    };

    const handleFriendRemoved = ({ friendId }) => {
      if (activeFriendRef.current?.id === friendId) {
        setActiveFriend(null);
        setMessages([]);
      }
      loadInitialData();
    };

    const handleUserTyping = ({ senderId, isTyping }) => {
      if (activeFriendRef.current?.id === senderId) {
        setIsFriendTyping(isTyping);
      }
    };

    // ================= WEBRTC CALL SIGNALING EVENTS =================
    
    // Incoming call received
    const handleIncomingCall = ({ from, signal, fromName, fromAvatarColor, isVideo }) => {
      if (callStateRef.current.status !== 'idle') {
        // Busy
        socket.emit('reject_call', { to: from });
        return;
      }

      setCallState({
        status: 'incoming',
        otherUser: {
          id: from,
          name: fromName,
          avatarColor: fromAvatarColor
        },
        isVideo: !!isVideo,
        incomingSignal: signal
      });
    };

    // Call accepted by peer
    const handleCallAccepted = async ({ signal }) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          // Process any queued ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          setCallState((prev) => ({ ...prev, status: 'connected' }));
        }
      } catch (err) {
        console.error('Error handling call_accepted:', err);
      }
    };

    // ICE Candidate from peer
    const handleIceCandidate = async ({ candidate }) => {
      try {
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      } catch (err) {
        console.error('Error handling ICE candidate:', err);
      }
    };

    // Call ended by peer
    const handleCallEnded = () => {
      showToast('Call ended', 'info');
      cleanupCall();
    };

    // Call rejected by peer
    const handleCallRejected = () => {
      showToast('Call was declined', 'info');
      cleanupCall();
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleMessageSent);
    socket.on('user_status_change', handleUserStatusChange);
    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friend_request_accepted', handleFriendRequestAccepted);
    socket.on('friend_request_rejected', handleFriendRequestUpdate);
    socket.on('friend_request_cancelled', handleFriendRequestUpdate);
    socket.on('friend_request_handled', handleFriendRequestUpdate);
    socket.on('friend_removed', handleFriendRemoved);
    socket.on('user_typing', handleUserTyping);

    // Call signaling
    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleCallEnded);
    socket.on('call_rejected', handleCallRejected);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleMessageSent);
      socket.off('user_status_change', handleUserStatusChange);
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friend_request_accepted', handleFriendRequestAccepted);
      socket.off('friend_request_rejected', handleFriendRequestUpdate);
      socket.off('friend_request_cancelled', handleFriendRequestUpdate);
      socket.off('friend_request_handled', handleFriendRequestUpdate);
      socket.off('friend_removed', handleFriendRemoved);
      socket.off('user_typing', handleUserTyping);

      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_ended', handleCallEnded);
      socket.off('call_rejected', handleCallRejected);
    };
  }, [currentUser, loadInitialData, showToast, cleanupCall]);

  // ================= CALL ACTIONS =================

  // Start Call (Audio or Video)
  const handleStartCall = async (targetFriend, isVideo = true) => {
    try {
      cleanupCall();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: true
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      setCallState({
        status: 'calling',
        otherUser: targetFriend,
        isVideo,
        incomingSignal: null
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local media tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote incoming track
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      const socket = getSocket();
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', {
            to: targetFriend.id,
            candidate: event.candidate
          });
        }
      };

      // Create and send WebRTC Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        userToCall: targetFriend.id,
        signalData: offer,
        isVideo,
        fromName: currentUser.name,
        fromAvatarColor: currentUser.avatarColor
      });
    } catch (err) {
      console.error('Call failed to initiate:', err);
      showToast(err.message || 'Could not access camera/microphone', 'error');
      cleanupCall();
    }
  };

  // Accept Incoming Call
  const handleAcceptCall = async () => {
    try {
      const isVideo = callState.isVideo;
      const caller = callState.otherUser;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
        audio: true
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const socket = getSocket();
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', {
            to: caller.id,
            candidate: event.candidate
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(callState.incomingSignal));

      // Process queued candidates
      while (pendingCandidatesRef.current.length > 0) {
        const cand = pendingCandidatesRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      }

      // Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', {
        to: caller.id,
        signal: answer
      });

      setCallState((prev) => ({ ...prev, status: 'connected' }));
    } catch (err) {
      console.error('Failed to accept call:', err);
      showToast(err.message || 'Could not access camera/microphone', 'error');
      handleDeclineCall();
    }
  };

  // Decline Incoming Call
  const handleDeclineCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser?.id) {
      socket.emit('reject_call', { to: callState.otherUser.id });
    }
    cleanupCall();
  };

  // User Ends Ongoing Call
  const handleUserEndCall = () => {
    const socket = getSocket();
    if (socket && callState.otherUser?.id) {
      socket.emit('end_call', { to: callState.otherUser.id });
    }
    cleanupCall();
  };

  // Select a friend and load chat history
  const handleSelectFriend = async (friend) => {
    setActiveFriend(friend);
    setIsFriendTyping(false);

    try {
      const chatMessages = await api.getMessages(friend.id);
      setMessages(chatMessages);

      setFriends((prev) =>
        prev.map((f) => (f.id === friend.id ? { ...f, unreadCount: 0 } : f))
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Send message
  const handleSendMessage = async (content) => {
    if (!activeFriend) return;

    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('send_message', {
        receiverId: activeFriend.id,
        content
      });
    } else {
      try {
        const newMsg = await api.sendMessage(activeFriend.id, content);
        setMessages((prev) => [...prev, newMsg]);
      } catch (err) {
        showToast(err.message || 'Failed to send message', 'error');
      }
    }
  };

  // Typing event
  const handleTyping = (isTyping) => {
    if (!activeFriend) return;
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
        receiverId: activeFriend.id
      });
    }
  };

  // Friend Requests
  const handleSendRequest = async (targetUserId) => {
    try {
      await api.sendFriendRequest(targetUserId);
      showToast('Friend request sent!', 'success');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'Could not send friend request', 'error');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.acceptFriendRequest(requestId);
      showToast('Friend request accepted! You can now chat.', 'success');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'Could not accept friend request', 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.rejectFriendRequest(requestId);
      showToast('Friend request declined.', 'info');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'Could not reject request', 'error');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await api.cancelFriendRequest(requestId);
      showToast('Friend request cancelled.', 'info');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'Could not cancel request', 'error');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await api.removeFriend(friendId);
      setActiveFriend(null);
      setMessages([]);
      showToast('Friend removed.', 'info');
      loadInitialData();
    } catch (err) {
      showToast(err.message || 'Could not remove friend', 'error');
    }
  };

  // Logout
  const handleLogout = () => {
    cleanupCall();
    setStoredToken(null);
    setStoredUser(null);
    disconnectSocket();
    setCurrentUser(null);
    setFriends([]);
    setAllUsers([]);
    setRequests({ incoming: [], outgoing: [] });
    setActiveFriend(null);
    setMessages([]);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Auth Screen Modal if user not logged in */}
      {!currentUser && (
        <AuthModal
          onAuthSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      )}

      {/* Main Chat Layout */}
      {currentUser && (
        <div className="flex w-full h-full relative">
          {/* Active / Incoming / Calling WebRTC Call Overlay */}
          {callState.status !== 'idle' && (
            <CallModal
              callState={callState}
              localStream={localStream}
              remoteStream={remoteStream}
              onAccept={handleAcceptCall}
              onDecline={handleDeclineCall}
              onEndCall={handleUserEndCall}
            />
          )}

          {/* Toast Notification Banner */}
          {toast && (
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-white text-xs shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
              {toast.type === 'friend' || toast.type === 'success' ? (
                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                </div>
              ) : toast.type === 'request' || toast.type === 'message' ? (
                <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Bell className="w-3.5 h-3.5" />
                </div>
              ) : (
                <div className="p-1 rounded-lg bg-slate-800 text-slate-400">
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}
              <span>{toast.message}</span>
            </div>
          )}

          {/* Sidebar */}
          <div className={`${activeFriend ? 'hidden md:flex' : 'flex'} w-full md:w-auto h-full`}>
            <Sidebar
              currentUser={currentUser}
              friends={friends}
              allUsers={allUsers}
              requests={requests}
              activeFriend={activeFriend}
              onSelectFriend={handleSelectFriend}
              onSendRequest={handleSendRequest}
              onAcceptRequest={handleAcceptRequest}
              onRejectRequest={handleRejectRequest}
              onCancelRequest={handleCancelRequest}
              onLogout={handleLogout}
            />
          </div>

          {/* Main Chat Area */}
          <div className={`${!activeFriend ? 'hidden md:flex' : 'flex'} flex-1 h-full`}>
            <ChatArea
              currentUser={currentUser}
              activeFriend={activeFriend}
              messages={messages}
              isTyping={isFriendTyping}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onRemoveFriend={handleRemoveFriend}
              onBack={() => setActiveFriend(null)}
              onStartCall={handleStartCall}
            />
          </div>
        </div>
      )}
    </div>
  );
}

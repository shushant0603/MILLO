import { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  User, 
  Maximize2,
  Volume2
} from 'lucide-react';

export default function CallModal({
  callState, // { status: 'calling' | 'incoming' | 'connected', otherUser, isVideo }
  localStream,
  remoteStream,
  onAccept,
  onDecline,
  onEndCall
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState.status]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState.status]);

  // Call duration counter
  useEffect(() => {
    let timer = null;
    if (callState.status === 'connected') {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState.status]);

  // Toggle Microphone
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const otherUser = callState.otherUser || { name: 'User', avatarColor: '#6366f1' };

  // ================= 1. INCOMING CALL SCREEN =================
  if (callState.status === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl overflow-hidden">
          {/* Animated pulsing wave rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full border-2 border-indigo-500/20 animate-ping [animation-duration:2s]" />
          </div>

          {/* Caller Avatar */}
          <div className="relative z-10 mb-5">
            <div
              className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-slate-800"
              style={{ backgroundColor: otherUser.avatarColor || '#6366f1' }}
            >
              {otherUser.name ? otherUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className="absolute -bottom-1 -right-1 left-0 right-0 flex justify-center">
              <span className="px-3 py-0.5 rounded-full bg-indigo-600 text-[11px] font-semibold text-white shadow-md flex items-center gap-1">
                {callState.isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                {callState.isVideo ? 'Video Call' : 'Audio Call'}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">{otherUser.name}</h3>
          <p className="text-xs text-slate-400 mb-8 animate-pulse">Incoming call...</p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6 relative z-10">
            {/* Decline */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={onDecline}
                className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all cursor-pointer"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <span className="text-[11px] text-slate-400">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                onClick={onAccept}
                className="w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition-all cursor-pointer animate-bounce"
              >
                {callState.isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
              </button>
              <span className="text-[11px] text-slate-400">Accept</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. OUTGOING CALLING SCREEN =================
  if (callState.status === 'calling') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
          <div className="relative mb-5">
            <div
              className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-slate-800"
              style={{ backgroundColor: otherUser.avatarColor || '#6366f1' }}
            >
              {otherUser.name ? otherUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className="absolute -bottom-1 -right-1 left-0 right-0 flex justify-center">
              <span className="px-3 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-300 shadow-md flex items-center gap-1">
                {callState.isVideo ? <Video className="w-3 h-3 text-indigo-400" /> : <Phone className="w-3 h-3 text-emerald-400" />}
                {callState.isVideo ? 'Video Calling' : 'Audio Calling'}
              </span>
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-1">{otherUser.name}</h3>
          <p className="text-xs text-indigo-400 mb-8 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            Ringing...
          </p>

          <button
            type="button"
            onClick={onEndCall}
            className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white mx-auto flex items-center justify-center shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            title="Cancel Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  // ================= 3. ACTIVE CONNECTED CALL SCREEN =================
  if (callState.status === 'connected') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
        {/* Top Header Bar */}
        <div className="h-16 px-6 bg-slate-900/60 backdrop-blur border-b border-slate-800 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
              style={{ backgroundColor: otherUser.avatarColor || '#6366f1' }}
            >
              {otherUser.name ? otherUser.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h4 className="font-semibold text-sm leading-tight">{otherUser.name}</h4>
              <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {formatDuration(callDuration)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
              🔒 End-to-End Encrypted WebRTC
            </span>
          </div>
        </div>

        {/* Main Viewport */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden">
          {callState.isVideo ? (
            <>
              {/* Remote Video (Full Screen) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video (Floating Picture-in-Picture in top right) */}
              <div className="absolute top-4 right-4 w-36 h-48 sm:w-48 sm:h-64 rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl bg-slate-950 z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2 text-center">
                    <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                    <span className="text-[10px]">Camera off</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded-md backdrop-blur">
                  You
                </div>
              </div>
            </>
          ) : (
            /* Audio Call Screen */
            <div className="flex flex-col items-center justify-center text-center p-6">
              <div className="relative mb-6">
                {/* Audio pulse ripples */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full bg-indigo-500/10 animate-ping [animation-duration:3s]" />
                </div>
                <div
                  className="w-32 h-32 rounded-3xl mx-auto flex items-center justify-center text-white text-4xl font-bold shadow-2xl border-4 border-slate-800 relative z-10"
                  style={{ backgroundColor: otherUser.avatarColor || '#6366f1' }}
                >
                  {otherUser.name ? otherUser.name[0].toUpperCase() : 'U'}
                </div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{otherUser.name}</h3>
              <p className="text-sm text-slate-400 font-mono mb-4">
                {formatDuration(callDuration)}
              </p>

              {/* Animated audio wave bars */}
              <div className="flex items-center gap-1.5 h-8">
                {[40, 70, 100, 60, 90, 50, 80, 30].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-indigo-500 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.15}s`
                    }}
                  />
                ))}
              </div>

              {/* Hidden audio element for remote stream */}
              <audio ref={remoteVideoRef} autoPlay playsInline />
            </div>
          )}
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div className="h-20 bg-slate-900/90 backdrop-blur border-t border-slate-800 flex items-center justify-center gap-4 px-4 z-20 shrink-0">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera (if video call) */}
          {callState.isVideo && (
            <button
              type="button"
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                isVideoOff
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
              title={isVideoOff ? 'Turn on Camera' : 'Turn off Camera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* Red End Call Button */}
          <button
            type="button"
            onClick={onEndCall}
            className="w-14 h-12 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}


import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import { formatMessageTime, formatFileSize } from '../utils/formatTime';
import {
  FiCheck, FiCheckCircle, FiMoreVertical, FiDownload,
  FiPlay, FiPause, FiFile, FiTrash2, FiCopy,
} from 'react-icons/fi';

const linkifyText = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer"
        className="text-blue-400 hover:underline break-all">
        {part}
      </a>
    ) : <span key={i}>{part}</span>
  );
};

const Message = memo(({
  message, isOwn, showAvatar, previousMessage, onDeleteForMe, onDeleteForEveryone,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const audioRef = useRef(null);
  const menuRef = useClickOutside(() => setShowMenu(false));

  const shouldShowAvatar = showAvatar &&
    (!previousMessage || previousMessage.sender?._id !== message.sender?._id);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setAudioDuration(audio.duration);
    const onTime = () => setAudioCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setAudioCurrentTime(0); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const sender = message.sender || {
    name: "Deleted Account",
    avatar: { url: "https://ui-avatars.com/api/?name=Deleted&background=cbd5e1&color=fff" },
    _id: "deleted"
  };

  const toggleAudio = useCallback(() => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const fmtTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  const statusIcon = isOwn ? (
    message.status === 'seen'
      ? <FiCheckCircle size={13} className="text-primary-400" />
      : message.status === 'delivered'
        ? <span className="flex"><FiCheck size={13} className="text-dark-400" /><FiCheck size={13} className="text-dark-400 -ml-1.5" /></span>
        : <FiCheck size={13} className="text-dark-400" />
  ) : null;

  const downloadFile = async (e, fileUrl, fileName) => {
    e.stopPropagation(); // Prevent opening image preview or other clicks
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      // Fallback if fetch fails (e.g. CORS issues)
      window.open(fileUrl, '_blank');
    }
  };

  const renderContent = () => {
    if (message.deletedForEveryone) {
      return <p className="message-system">🚫 This message was deleted</p>;
    }

    switch (message.messageType) {
      case 'image':
        return (
          <div>
            <div className="relative rounded-lg overflow-hidden cursor-pointer group/img" onClick={() => setShowFullImage(true)}>
              {!imageLoaded && (
                <div className="w-52 h-52 skeleton flex items-center justify-center">
                  <div className="spinner spinner-sm spinner-primary" />
                </div>
              )}
              <img
                src={message.file?.url}
                alt="Shared"
                className={`max-w-xs rounded-lg transition-default ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
                onLoad={() => setImageLoaded(true)}
              />

              {/* ✅ DOWNLOAD BUTTON FOR IMAGE */}
              <button 
                onClick={(e) => downloadFile(e, message.file?.url, message.file?.name)}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover/img:opacity-100 transition-opacity"
                title="Download"
              >
                <FiDownload size={14} />
              </button>
            </div>
            {message.content && (
              <p className="mt-2 text-sm whitespace-pre-wrap wrap-break-word">
                {linkifyText(message.content)}
              </p>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative group/vid">
            <video src={message.file?.url} controls className="max-w-xs rounded-lg" preload="metadata" />

            {/* ✅ DOWNLOAD BUTTON FOR VIDEO (Top-Right overlay) */}
            <button 
              onClick={(e) => downloadFile(e, message.file?.url, message.file?.name)}
              className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover/vid:opacity-100 transition-opacity z-10"
              title="Download"
            >
              <FiDownload size={14} />
            </button>

            {message.content && (
              <p className="mt-2 text-sm whitespace-pre-wrap wrap-break-word">
                {linkifyText(message.content)}
              </p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px] relative group/audio">
            <audio ref={audioRef} src={message.file?.url} preload="metadata" />
            <button
              onClick={toggleAudio}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-default ${
                isOwn ? 'bg-primary-700 hover:bg-primary-800' : 'bg-dark-300 hover:bg-dark-400'
              }`}
            >
              {isPlaying
                ? <FiPause size={16} className="text-white" />
                : <FiPlay size={16} className="text-white ml-0.5" />}
            </button>
            <div className="flex-1">
              <div className="h-1.5 bg-dark-300/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-400 rounded-full transition-all duration-100"
                  style={{ width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-dark-400 font-mono">
                <span>{fmtTime(audioCurrentTime)}</span>
                <span>{fmtTime(audioDuration)}</span>
              </div>
            </div>

            {/* ✅ DOWNLOAD BUTTON FOR AUDIO */}
            <button 
              onClick={(e) => downloadFile(e, message.file?.url, message.file?.name)}
              className="p-1.5 hover:bg-black/10 rounded-full text-dark-400 transition-colors"
              title="Download"
            >
              <FiDownload size={14} />
            </button>
          </div>
        );

      case 'file':
        return (
          <div
            onClick={(e) => downloadFile(e, message.file?.url, message.file?.name)}
            className={`flex items-center gap-3 p-3 rounded-xl transition-default cursor-pointer ${
              isOwn ? 'bg-primary-700/50 hover:bg-primary-700/70' : 'bg-dark-300/50 hover:bg-dark-300/70'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isOwn ? 'bg-primary-600' : 'bg-dark-300'
            }`}>
              <FiFile size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">{message.file?.name || 'File'}</p>
              <p className="text-xs text-dark-500">{formatFileSize(message.file?.size || 0)}</p>
            </div>
            <FiDownload size={16} className="text-dark-500 shrink-0" />
          </div>
        );

      default:
        return (
          <p className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
            {linkifyText(message.content)}
          </p>
        );
    }
  };

  return (
    <>
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-0.5`}>
        <div className={`flex items-end gap-2 max-w-[80%] lg:max-w-[65%] ${isOwn ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          {shouldShowAvatar && !isOwn ? (
            <img
              src={sender?.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.name || 'U')}&size=32&background=0284c7&color=fff`}
              alt={message.sender?.name}
              className="avatar-sm mb-1 shrink-0 rounded-full"
            />
          ) : showAvatar && !isOwn ? (
            <div className="w-8 shrink-0" />
          ) : null}

          {/* Bubble */}
          <div className="relative group">
            {shouldShowAvatar && !isOwn && (
              <p className="text-[11px] text-primary-400 font-medium mb-1 ml-1">
                {message.sender?.name}
              </p>
            )}

            <div className={`message-bubble ${isOwn ? 'message-sent' : 'message-received'}`}>
              {renderContent()}
              <div className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] opacity-60">
                  {formatMessageTime(message.createdAt)}
                </span>
                {statusIcon}
              </div>
            </div>

            {/* Context Menu */}
            <div
              ref={menuRef}
              className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-default z-10 ${
                isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'
              }`}
            >
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="btn-ghost p-1"
              >
                <FiMoreVertical size={14} />
              </button>

              {showMenu && (
                <div className={`dropdown-menu w-44 ${isOwn ? 'right-0' : 'left-0'}`}>
                  {message.messageType === 'text' && !message.deletedForEveryone && (
                    <button onClick={handleCopy} className="dropdown-item">
                      <FiCopy size={13} /> Copy Text
                    </button>
                  )}
                  <button
                    onClick={() => { onDeleteForMe(message._id); setShowMenu(false); }}
                    className="dropdown-item"
                  >
                    <FiTrash2 size={13} /> Delete for me
                  </button>
                  {isOwn && !message.deletedForEveryone && (
                    <>
                      <div className="dropdown-divider" />
                      <button
                        onClick={() => { onDeleteForEveryone(message._id); setShowMenu(false); }}
                        className="dropdown-item dropdown-item-danger"
                      >
                        <FiTrash2 size={13} /> Delete for everyone
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {showFullImage && message.file?.url && (
        <div
          className="lightbox-overlay"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={message.file.url}
            alt="Full size"
            className="lightbox-image"
          />
          <button
            onClick={(e) => downloadFile(e, message.file.url, message.file.name)}
            className="absolute top-6 right-6 btn-ghost glass p-3 rounded-xl"
          >
            <FiDownload size={20} />
          </button>
        </div>
      )}
    </>
  );
});

Message.displayName = 'Message';
export default Message;

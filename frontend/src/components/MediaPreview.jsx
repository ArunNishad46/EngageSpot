import { useState, useRef, useEffect } from 'react';
import { formatFileSize } from '../utils/formatTime';
import { FiX, FiSend, FiFile, FiMusic, FiPlay, FiPause, FiSmile } from 'react-icons/fi';
import EmojiPickerComponent from './EmojiPickerComponent';

const MediaPreview = ({ file, onClose, onSend, sending, message, onMessageChange }) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const audioRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (file.type !== 'audio' || !audioRef.current) return;
    const audio = audioRef.current;
    const onMeta = () => setAudioDuration(audio.duration);
    const onTime = () => setAudioCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setAudioCurrentTime(0); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => { audio.pause(); };
  }, [file.type]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const fmtTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };

  const handleEmojiSelect = (emoji) => {
    onMessageChange({ target: { value: (message || '') + emoji.native } });
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); onSend(); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="file-preview-overlay">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-200/50 shrink-0">
        <h3 className="text-lg font-semibold text-white">
          Send {file.type === 'image' ? 'Photo' : file.type === 'video' ? 'Video' : file.type === 'audio' ? 'Audio' : 'File'}
        </h3>
        <button onClick={onClose} className="btn-ghost">
          <FiX size={24} />
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div className="max-w-2xl w-full">
          {/* Image */}
          {file.type === 'image' && (
            <div className="card overflow-hidden">
              <img src={file.url} alt="Preview" className="max-w-full max-h-[60vh] mx-auto object-contain" />
            </div>
          )}

          {/* Video */}
          {file.type === 'video' && (
            <div className="card overflow-hidden">
              <video src={file.url} controls className="max-w-full max-h-[60vh] mx-auto" />
            </div>
          )}

          {/* Audio */}
          {file.type === 'audio' && (
            <div className="card p-6 max-w-md mx-auto">
              <audio ref={audioRef} src={file.url} preload="metadata" />
              <div className="flex flex-col items-center">
                {/* Waveform */}
                <div className="flex items-end justify-center gap-1 h-20 mb-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className={`recording-wave bg-primary-500 ${isPlaying ? 'animate-pulse' : ''}`}
                      style={{ height: `${Math.random() * 60 + 20}%`, animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>

                {/* Play Button */}
                <button
                  onClick={toggleAudio}
                  className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center transition-default hover:shadow-glow-primary mb-4"
                >
                  {isPlaying
                    ? <FiPause size={28} className="text-white" />
                    : <FiPlay size={28} className="text-white ml-1" />}
                </button>

                {/* Progress */}
                <div className="w-full">
                  <div className="h-1.5 bg-dark-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-100"
                      style={{ width: `${audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-dark-400 font-mono">
                    <span>{fmtTime(audioCurrentTime)}</span>
                    <span>{fmtTime(audioDuration)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* File */}
          {file.type === 'file' && (
            <div className="card p-8 max-w-md mx-auto text-center">
              <div className="w-20 h-20 bg-dark-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiFile size={36} className="text-primary-400" />
              </div>
              <h4 className="text-lg font-medium text-white mb-1 truncate">{file.name}</h4>
              <p className="text-dark-400 text-sm">{formatFileSize(file.size)}</p>
            </div>
          )}

          {/* File Info */}
          <div className="mt-4 text-center text-sm text-dark-400">
            <p>{file.name}</p>
            <p>{formatFileSize(file.size)}</p>
          </div>
        </div>
      </div>

      {/* Caption Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-dark-200/50 bg-dark-100 shrink-0 safe-bottom">
        <div className="flex items-end gap-3 max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message || ''}
              onChange={onMessageChange}
              onKeyDown={handleKeyDown}
              placeholder="Add a caption..."
              className="input-field pr-10"
            />
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors-fast"
            >
              <FiSmile size={18} />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPickerComponent
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
          <button type="submit" disabled={sending} className="btn-primary p-3">
            {sending
              ? <div className="spinner spinner-sm" />
              : <FiSend size={20} />}
          </button>
        </div>
        <p className="text-center text-xs text-dark-400 mt-2">
          Press Enter to send · Escape to cancel
        </p>
      </form>
    </div>
  );
};

export default MediaPreview;

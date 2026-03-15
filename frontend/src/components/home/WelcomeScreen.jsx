import { FiMessageSquare, FiLock, FiZap, FiSmile } from 'react-icons/fi';

const WelcomeScreen = () => {
  const features = [
    { icon: FiLock, text: 'End-to-end encrypted messages' },
    { icon: FiZap, text: 'Real-time messaging with status updates' },
    { icon: FiSmile, text: 'Share photos, videos, and files' },
  ];

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-glow-primary">
          <FiMessageSquare size={48} className="text-white animate-pulse" />
        </div>

        <h2 className="text-2xl font-bold gradient-text-primary mb-3">
          Welcome to EngageSpot
        </h2>
        <p className="text-dark-400 mb-8">
          Select a conversation or start a new one to begin messaging
        </p>

        {/* Feature Cards */}
        <div className="space-y-3">
          {features.map(({ icon: Icon, text }, i) => (
            <div
              key={i}
              className="card card-hover flex items-center gap-3 text-left p-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-600/10 flex items-center justify-center shrink-0">
                <Icon size={20} className="text-primary-400" />
              </div>
              <p className="text-dark-500 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
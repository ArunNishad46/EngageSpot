import { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff, FiLoader } from 'react-icons/fi';

const ConnectionStatus = ({ status }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === 'connected') {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    } else if (status !== 'disconnected') {
      setVisible(true);
    }
  }, [status]);

  if (!visible) return null;

  const config = {
    connecting: {
      className: 'connection-bar connection-connecting',
      icon: <FiLoader className="animate-spin" size={14} />,
      text: 'Reconnecting...',
    },
    connected: {
      className: 'connection-bar connection-connected',
      icon: <FiWifi size={14} />,
      text: 'Connected',
    },
    error: {
      className: 'connection-bar connection-error',
      icon: <FiWifiOff size={14} />,
      text: 'Connection lost. Retrying...',
    },
    disconnected: {
      className: 'connection-bar connection-error',
      icon: <FiWifiOff size={14} />,
      text: 'Disconnected',
    },
  };

  const { className, icon, text } = config[status] || config.disconnected;

  return (
    <div className={className}>
      {icon}
      <span>{text}</span>
    </div>
  );
};

export default ConnectionStatus;
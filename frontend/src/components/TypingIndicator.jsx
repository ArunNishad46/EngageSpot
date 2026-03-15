import { memo } from 'react';

const TypingIndicator = memo(({ userName }) => (
  <div className="flex items-end gap-2 mb-1">
    <div className="avatar-sm bg-dark-200 shrink-0 rounded-full" />
    <div className="message-received rounded-2xl rounded-bl-md px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      {userName && (
        <p className="text-[10px] text-dark-400 mt-1.5 font-medium">
          {userName} is typing...
        </p>
      )}
    </div>
  </div>
));

TypingIndicator.displayName = 'TypingIndicator';
export default TypingIndicator;


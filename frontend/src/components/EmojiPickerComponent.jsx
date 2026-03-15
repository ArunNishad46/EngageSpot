import { useRef } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import EmojiPicker from 'emoji-picker-react';

const EmojiPickerComponent = ({ onEmojiSelect, onClose }) => {
  const pickerRef = useClickOutside(onClose);

  const handleEmojiClick = (emojiData) => {
    onEmojiSelect({ native: emojiData.emoji });
  };

  return (
    <div
      ref={pickerRef}
      className="card overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        theme="dark"
        emojiStyle="native"
        skinTonesDisabled={false}
        searchPlaceHolder="Search emojis..."
        width={320}
        height={400}
        previewConfig={{ showPreview: false }}
        categories={[
          'smileys_people',
          'animals_nature',
          'food_drink',
          'travel_places',
          'activities',
          'objects',
          'symbols',
          'flags',
        ]}
        searchDisabled={false}
        lazyLoadEmojis
      />
    </div>
  );
};

export default EmojiPickerComponent;


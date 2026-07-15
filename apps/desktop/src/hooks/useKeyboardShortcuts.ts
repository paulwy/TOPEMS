import { useEffect } from 'react';
import { windowApi } from '../utils/tauri';

const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key.toLowerCase()) {
          case 'tab':
            event.preventDefault();
            await windowApi.next();
            break;
          case 'w':
            event.preventDefault();
            await windowApi.closeCurrent();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
};

export default useKeyboardShortcuts;

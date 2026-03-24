import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const data = await AsyncStorage.getItem('orbita_bookmarks');
      if (data) setBookmarks(JSON.parse(data));
    } catch (e) {
      console.error(e);
    }
  };

  const addBookmark = async (title: string, coords: [number, number], category: string) => {
    try {
      const newBm = { id: Date.now().toString(), title, coords, category };
      const updated = [...bookmarks, newBm];
      setBookmarks(updated);
      await AsyncStorage.setItem('orbita_bookmarks', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const removeBookmark = async (id: string) => {
    try {
      const updated = bookmarks.filter(b => b.id !== id);
      setBookmarks(updated);
      await AsyncStorage.setItem('orbita_bookmarks', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  return { bookmarks, addBookmark, removeBookmark };
}

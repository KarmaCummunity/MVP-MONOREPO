import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKMARKS_KEY = 'user_bookmarks';

export interface Bookmark {
  id: string;
  postId: string;
  userId: string;
  timestamp: string;
  postData: {
    title: string;
    description: string;
    thumbnail: string;
    user: {
      id: string;
      name: string;
      avatar: string;
    };
  };
}

/** Minimal post shape required when adding a bookmark (id + fields stored in Bookmark.postData). */
export type PostDataForBookmark = { id: string } & Bookmark['postData'];

const getStoredBookmarks = async (): Promise<Bookmark[]> => {
  try {
    const data = await AsyncStorage.getItem(BOOKMARKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('❌ Error getting bookmarks:', error);
    return [];
  }
};

const setStoredBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('❌ Error setting bookmarks:', error);
  }
};

export const addBookmark = async (userId: string, postData: PostDataForBookmark): Promise<boolean> => {
  try {
    const bookmarks = await getStoredBookmarks();
    
    const existingBookmark = bookmarks.find(
      bookmark => bookmark.userId === userId && bookmark.postId === postData.id
    );
    
    if (existingBookmark) {
      console.log('📖 Post already bookmarked');
      return false;
    }

    const newBookmark: Bookmark = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId: postData.id,
      userId,
      timestamp: new Date().toISOString(),
      postData: {
        title: postData.title,
        description: postData.description,
        thumbnail: postData.thumbnail,
        user: postData.user,
      },
    };

    bookmarks.push(newBookmark);
    await setStoredBookmarks(bookmarks);
    
    console.log('✅ Bookmark added:', newBookmark.id);
    return true;
  } catch (error) {
    console.error('❌ Add bookmark error:', error);
    return false;
  }
};

export const removeBookmark = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const bookmarks = await getStoredBookmarks();
    const filteredBookmarks = bookmarks.filter(
      bookmark => !(bookmark.userId === userId && bookmark.postId === postId)
    );
    
    await setStoredBookmarks(filteredBookmarks);
    
    console.log('✅ Bookmark removed');
    return true;
  } catch (error) {
    console.error('❌ Remove bookmark error:', error);
    return false;
  }
};

export const getBookmarks = async (userId: string): Promise<Bookmark[]> => {
  try {
    const bookmarks = await getStoredBookmarks();
    return bookmarks
      .filter(bookmark => bookmark.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.error('❌ Get bookmarks error:', error);
    return [];
  }
};

export const isBookmarked = async (userId: string, postId: string): Promise<boolean> => {
  try {
    const bookmarks = await getStoredBookmarks();
    return bookmarks.some(
      bookmark => bookmark.userId === userId && bookmark.postId === postId
    );
  } catch (error) {
    console.error('❌ Check bookmark error:', error);
    return false;
  }
};

export const clearAllBookmarks = async (userId: string): Promise<void> => {
  try {
    const bookmarks = await getStoredBookmarks();
    const filteredBookmarks = bookmarks.filter(bookmark => bookmark.userId !== userId);
    await setStoredBookmarks(filteredBookmarks);
    console.log('✅ All bookmarks cleared for user:', userId);
  } catch (error) {
    console.error('❌ Clear bookmarks error:', error);
  }
}; 
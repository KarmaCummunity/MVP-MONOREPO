// utils/fileService.ts
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform, Alert } from 'react-native';

export interface FileData {
  id: string;
  name: string;
  uri: string;
  type: 'image' | 'video' | 'file';
  size?: number;
  mimeType?: string;
  thumbnail?: string;
}

export interface FileUploadResult {
  success: boolean;
  fileData?: FileData;
  error?: string;
}

export const requestPermissions = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'ios') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'הרשאות נדרשות',
          'אנא אשר גישה לגלריית התמונות כדי לשלוח תמונות וסרטונים'
        );
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('❌ Permission request error:', error);
    return false;
  }
};

export const pickImage = async (): Promise<FileUploadResult> => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return { success: false, error: 'אין הרשאות לגישה לגלריה' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileData: FileData = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `image_${Date.now()}.jpg`,
        uri: asset.uri,
        type: 'image',
        size: asset.fileSize,
        mimeType: 'image/jpeg',
      };

      return { success: true, fileData };
    }

    return { success: false, error: 'לא נבחרה תמונה' };
  } catch (error) {
    console.error('❌ Pick image error:', error);
    return { success: false, error: 'שגיאה בבחירת תמונה' };
  }
};

export const pickVideo = async (): Promise<FileUploadResult> => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return { success: false, error: 'אין הרשאות לגישה לגלריה' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
      allowsMultipleSelection: false,
      videoMaxDuration: 60, 
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        return { success: false, error: 'הקובץ גדול מדי. מקסימום 50MB' };
      }

      const fileData: FileData = {
        id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `video_${Date.now()}.mp4`,
        uri: asset.uri,
        type: 'video',
        size: asset.fileSize,
        mimeType: 'video/mp4',
      };

      return { success: true, fileData };
    }

    return { success: false, error: 'לא נבחר סרטון' };
  } catch (error) {
    console.error('❌ Pick video error:', error);
    return { success: false, error: 'שגיאה בבחירת סרטון' };
  }
};

export const takePhoto = async (): Promise<FileUploadResult> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'הרשאות נדרשות',
        'אנא אשר גישה למצלמה כדי לצלם תמונה'
      );
      return { success: false, error: 'אין הרשאות למצלמה' };
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileData: FileData = {
        id: `cam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: `photo_${Date.now()}.jpg`,
        uri: asset.uri,
        type: 'image',
        size: asset.fileSize,
        mimeType: 'image/jpeg',
      };

      return { success: true, fileData };
    }

    return { success: false, error: 'לא צולמה תמונה' };
  } catch (error) {
    console.error('❌ Take photo error:', error);
    return { success: false, error: 'שגיאה בצילום תמונה' };
  }
};

export const pickDocument = async (): Promise<FileUploadResult> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      
      if (asset.size && asset.size > 20 * 1024 * 1024) {
        return { success: false, error: 'הקובץ גדול מדי. מקסימום 20MB' };
      }

      const fileData: FileData = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: asset.name,
        uri: asset.uri,
        type: 'file',
        size: asset.size,
        mimeType: asset.mimeType,
      };

      return { success: true, fileData };
    }

    return { success: false, error: 'לא נבחר קובץ' };
  } catch (error) {
    console.error('❌ Pick document error:', error);
    return { success: false, error: 'שגיאה בבחירת קובץ' };
  }
};

export const generateThumbnail = async (fileUri: string, type: 'image' | 'video'): Promise<string | null> => {
  try {
    if (type === 'image') {
      return fileUri;
    } else if (type === 'video') {
      return null;
    }
    return null;
  } catch (error) {
    console.error('❌ Generate thumbnail error:', error);
    return null;
  }
};

export const getFileType = (fileName: string, mimeType?: string): 'image' | 'video' | 'file' => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
  }
  
  if (extension) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    
    if (imageExtensions.includes(extension)) return 'image';
    if (videoExtensions.includes(extension)) return 'video';
  }
  
  return 'file';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFile = (fileData: FileData, maxFileSize?: number): { isValid: boolean; error?: string } => {
  if (fileData.size) {
    // If maxFileSize is provided, use it; otherwise use defaults
    const maxSize = maxFileSize || (
      fileData.type === 'video' ? 50 * 1024 * 1024 : // 50MB לסרטונים
      fileData.type === 'image' ? 10 * 1024 * 1024 : // 10MB לתמונות
      20 * 1024 * 1024 // 20MB לקבצים (default)
    );
    
    if (fileData.size > maxSize) {
      return { 
        isValid: false, 
        error: `הקובץ גדול מדי. מקסימום ${formatFileSize(maxSize)}` 
      };
    }
  }
  
  if (fileData.type === 'file') {
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js'];
    const extension = fileData.name.toLowerCase().split('.').pop();
    
    if (extension && dangerousExtensions.includes(extension)) {
      return { 
        isValid: false, 
        error: 'סוג קובץ זה אינו נתמך מטעמי אבטחה' 
      };
    }
  }
  
  return { isValid: true };
}; 
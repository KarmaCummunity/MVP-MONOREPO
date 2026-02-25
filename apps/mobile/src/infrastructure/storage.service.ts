// utils/storageService.ts
import { getFirebase } from './firebaseClient';
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from 'firebase/storage';
import { IS_DEVELOPMENT } from './config.constants';

export interface UploadResult {
  url: string;
  fullPath: string;
}

export interface UploadProgressCallback {
  (progress: number): void; // progress is 0-100
}

export async function uploadFile(
  fullPath: string,
  uri: string,
  contentType?: string
): Promise<UploadResult> {
  const { storage } = getFirebase();
  const storageRef = ref(storage, fullPath);

  const response = await fetch(uri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, { contentType });
  const url = await getDownloadURL(storageRef);
  return { url, fullPath };
}

export async function uploadFileWithProgress(
  fullPath: string,
  uri: string,
  contentType: string | undefined,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  const { storage } = getFirebase();
  const storageRef = ref(storage, fullPath);

  let blob: Blob;

  try {
    // Handle different URI types
    if (uri.startsWith('blob:') || uri.startsWith('data:')) {
      // For blob or data URIs, fetch directly
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      blob = await response.blob();
    } else if (uri.startsWith('file://') || uri.startsWith('/')) {
      // For file:// URIs (mobile) or absolute paths
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      blob = await response.blob();
    } else {
      // For HTTP/HTTPS URIs
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      blob = await response.blob();
    }
  } catch (fetchError: any) {
    console.error('❌ Error fetching file for upload:', fetchError);
    throw new Error(`Failed to read file: ${fetchError.message || 'Unknown error'}`);
  }

  const uploadTask = uploadBytesResumable(storageRef, blob, { contentType });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        }
      },
      (error) => {
        console.error('❌ Firebase Storage upload error:', error);
        // Provide more detailed error message
        const errorMessage = error.message || error.code || 'Unknown error';
        if (error.code === 'storage/unauthorized' || errorMessage.includes('CORS')) {
          reject(new Error('CORS error: Please check Firebase Storage Rules to allow uploads from your origin'));
        } else {
          reject(error);
        }
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, fullPath });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

export function sanitizeFileName(fileName: string): string {
  // Extract extension
  const lastDot = fileName.lastIndexOf('.');
  const extension = lastDot > 0 ? fileName.substring(lastDot).toLowerCase() : '';
  const nameWithoutExt = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;

  // Remove special characters: <>:"/\|?*
  let sanitized = nameWithoutExt.replace(/[<>:"/\\|?*]/g, '_');

  // Replace spaces with underscores
  sanitized = sanitized.replace(/\s+/g, '_');

  // Remove non-ASCII characters (Hebrew, Arabic, etc.) and replace with underscore
  // Keep only ASCII letters, numbers, underscores, hyphens, and dots
  sanitized = sanitized.replace(/[^\u0000-\u007F]/g, '_');

  // Remove multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // If name is empty after sanitization, use 'file'
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'file';
  }

  // Add timestamp to prevent collisions
  const timestamp = Date.now();
  const finalName = sanitized || 'file';

  return `${finalName}_${timestamp}${extension}`;
}

export function buildChatFilePath(conversationId: string, messageId: string, fileName: string) {
  const sanitizedFileName = sanitizeFileName(fileName);
  const prefix = IS_DEVELOPMENT ? 'dev-' : '';
  return `${prefix}chat/${conversationId}/${messageId}/${sanitizedFileName}`;
}

export function buildUserImagePath(userId: string, fileName: string) {
  const prefix = IS_DEVELOPMENT ? 'dev-' : '';
  return `${prefix}images/users/${userId}/${fileName}`;
}

export function buildDonationImagePath(donationId: string, fileName: string) {
  const prefix = IS_DEVELOPMENT ? 'dev-' : '';
  return `${prefix}images/donations/${donationId}/${fileName}`;
}

export function buildAdminFilePath(folderPath: string, fileId: string, fileName: string): string {
  // Sanitize folder path - remove leading/trailing slashes and special characters
  let sanitizedFolder = folderPath
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/[<>:"/\\|?*]/g, '_') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^\u0000-\u007F]/g, '_'); // Remove non-ASCII characters (Hebrew, etc.)

  // Remove multiple consecutive underscores
  sanitizedFolder = sanitizedFolder.replace(/_+/g, '_');

  // Remove leading/trailing underscores
  sanitizedFolder = sanitizedFolder.replace(/^_+|_+$/g, '');

  // Default to 'root' if empty
  if (!sanitizedFolder || sanitizedFolder.length === 0) {
    sanitizedFolder = 'root';
  }

  // Sanitize fileId to ensure it's safe
  const sanitizedFileId = fileId.replace(/[<>:"/\\|?*\s]/g, '_').replace(/[^\u0000-\u007F]/g, '_');

  const sanitizedFileName = sanitizeFileName(fileName);
  const prefix = IS_DEVELOPMENT ? 'dev-' : '';
  return `${prefix}admin-files/${sanitizedFolder}/${sanitizedFileId}/${sanitizedFileName}`;
}



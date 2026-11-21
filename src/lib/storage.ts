import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '@/lib/firebase';

/**
 * Upload a single product image to Firebase Storage.
 * Path: products/{productId}/{filename}
 * Returns the public download URL.
 */
export async function uploadProductImage(
  file: File,
  productId: string
): Promise<string> {
  const storageRef = ref(storage, `products/${productId}/${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
}

/**
 * Delete a product image from Firebase Storage by its download URL.
 */
export async function deleteProductImage(url: string): Promise<void> {
  const storageRef = ref(storage, url);
  await deleteObject(storageRef);
}

/**
 * Upload multiple product images in parallel.
 * Returns an array of download URLs.
 */
export async function uploadMultipleImages(
  files: File[],
  productId: string
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadProductImage(file, productId));
  return Promise.all(uploadPromises);
}

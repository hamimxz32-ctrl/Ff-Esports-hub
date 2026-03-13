import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type NotificationType = 'comment' | 'reply' | 'like' | 'mention' | 'message';

export const sendNotification = async (
  recipientUid: string,
  senderUid: string,
  senderName: string,
  type: NotificationType,
  message: string,
  link?: string
) => {
  if (recipientUid === senderUid) return; // Don't notify self

  try {
    await addDoc(collection(db, 'notifications'), {
      recipientUid,
      senderUid,
      senderName,
      type,
      message,
      link,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
};

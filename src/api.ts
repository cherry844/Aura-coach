import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp,
  increment,
  addDoc
} from "firebase/firestore";
import { db, auth, storage, ref, uploadBytesResumable, uploadString, getDownloadURL } from "./lib/firebase";
import { User, Lesson, Feedback, LessonCompletion } from "./types";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const api = {
  async getUsers(): Promise<User[]> {
    const path = "users";
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => doc.data() as User);
      return users.sort((a, b) => (b.points || 0) - (a.points || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getUser(userId: string): Promise<User | null> {
    const path = `users/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, "users", userId));
      if (docSnap.exists()) {
        return docSnap.data() as User;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveUser(user: Partial<User>) {
    if (!user.id) return;
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, "users", user.id), {
        ...user,
        updated_at: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getLessons(): Promise<Lesson[]> {
    const path = "lessons";
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      const lessons = snapshot.docs.map(doc => doc.data() as Lesson);
      return lessons.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveLesson(lesson: Partial<Lesson>) {
    const path = "lessons";
    try {
      const id = lesson.id || doc(collection(db, path)).id;
      await setDoc(doc(db, path, id), {
        ...lesson,
        id,
        created_at: lesson.created_at || new Date().toISOString()
      }, { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return null;
    }
  },

  async deleteLesson(lessonId: string) {
    const path = `lessons/${lessonId}`;
    try {
      await deleteDoc(doc(db, "lessons", lessonId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getMatches(userId: string): Promise<User[]> {
    const path = "users";
    try {
      const users = await this.getUsers();
      return users.filter(u => u.id !== userId);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getActiveMatches(userId: string): Promise<any[]> {
    const path = "matches";
    try {
      const qA = query(collection(db, path), where("user_a", "==", userId));
      const qB = query(collection(db, path), where("user_b", "==", userId));
      
      const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);
      const matches = [...snapA.docs, ...snapB.docs].map(doc => ({ id: doc.id, ...doc.data() }));
      
      return matches.filter((m: any) => m.status !== "completed");
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async createMatch(user_a: string, user_b: string, skill: string) {
    const path = "matches";
    try {
      const matchData = {
        user_a,
        user_b,
        skill,
        status: "pending",
        created_at: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, path), matchData);
      return { success: true, matchId: docRef.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async completeLesson(userId: string, lessonId: string, lessonTitle?: string, skillTag?: string) {
    const path = `users/${userId}/lesson_completions/${lessonId}`;
    try {
      const completionRef = doc(db, "users", userId, "lesson_completions", lessonId);
      const snap = await getDoc(completionRef);
      if (snap.exists()) return { success: true, alreadyCompleted: true };

      await setDoc(completionRef, {
        user_id: userId,
        lesson_id: lessonId,
        lesson_title: lessonTitle || '',
        skill_tag: skillTag || '',
        completed_at: new Date().toISOString()
      });

      await updateDoc(doc(db, "users", userId), {
        points: increment(10),
        completed_lessons_count: increment(1)
      });

      return { success: true, pointsAwarded: 10 };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return { success: false };
    }
  },

  async getCompletedLessonIds(userId: string): Promise<string[]> {
    const path = `users/${userId}/lesson_completions`;
    try {
      const snap = await getDocs(collection(db, "users", userId, "lesson_completions"));
      return snap.docs.map(doc => doc.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getCompletedLessons(userId: string): Promise<LessonCompletion[]> {
    const path = `users/${userId}/lesson_completions`;
    try {
      const snap = await getDocs(collection(db, "users", userId, "lesson_completions"));
      return snap.docs.map(d => ({
        lesson_id: d.id,
        user_id: userId,
        completed_at: d.data().completed_at || '',
        lesson_title: d.data().lesson_title || '',
        skill_tag: d.data().skill_tag || ''
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async completeMatch(userId: string, matchId: string) {
    const path = `matches/${matchId}`;
    try {
      await updateDoc(doc(db, "matches", matchId), {
        status: "completed"
      });

      await updateDoc(doc(db, "users", userId), {
        points: increment(50),
        completed_matches_count: increment(1)
      });

      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async submitFeedback(feedback: Partial<Feedback>) {
    const path = "feedback";
    try {
      await addDoc(collection(db, path), {
        ...feedback,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getFeedback(userId: string): Promise<Feedback[]> {
    const path = "feedback";
    try {
      const q = query(collection(db, path), where("to_user_id", "==", userId));
      const snapshot = await getDocs(q);
      const feedback = snapshot.docs.map(doc => doc.data() as Feedback);
      return feedback.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  /**
   * Upload profile avatar image to Firebase Storage with validation and progress callback
   */
  async uploadProfileAvatar(userId: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Please select a valid image file (JPEG, PNG, WebP, or GIF).');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Image size must be less than 5MB.');
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const storagePath = `profile_avatars/${userId}/${Date.now()}_avatar.${fileExt}`;
    const fileRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          }
        },
        (error) => {
          console.error('Firebase Storage avatar upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  },

  /**
   * Upload custom lesson cover image to Firebase Storage with validation and progress callback
   */
  async uploadLessonCover(lessonId: string, file: File, onProgress?: (pct: number) => void): Promise<string> {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Please select a valid image file (JPEG, PNG, WebP, or SVG).');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('Cover image size must be less than 8MB.');
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const storagePath = `lesson_covers/${lessonId}/${Date.now()}_cover.${fileExt}`;
    const fileRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          }
        },
        (error) => {
          console.error('Firebase Storage lesson cover upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  },

  /**
   * Generate an educational cover illustration via server API and save to Firebase Storage
   */
  async generateAndSaveLessonCover(
    title: string, 
    category: string, 
    description?: string, 
    lessonId?: string
  ): Promise<{ coverUrl: string; source: 'ai' | 'fallback' }> {
    const res = await fetch('/api/lessons/generate-cover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, description })
    });

    if (!res.ok) {
      throw new Error(`Cover generation failed: ${res.statusText}`);
    }

    const data = await res.json();
    const rawImageUrl: string = data.imageUrl;
    const source: 'ai' | 'fallback' = data.source || 'fallback';

    // If it's a data URL, upload to Firebase Storage to have a persistent cloud URL
    if (rawImageUrl && rawImageUrl.startsWith('data:')) {
      try {
        const targetId = lessonId || `lesson_${Date.now()}`;
        const isPng = rawImageUrl.startsWith('data:image/png');
        const ext = isPng ? 'png' : 'svg';
        const storagePath = `lesson_covers/${targetId}/cover_${Date.now()}.${ext}`;
        const storageRef = ref(storage, storagePath);
        
        await uploadString(storageRef, rawImageUrl, 'data_url');
        const downloadUrl = await getDownloadURL(storageRef);
        return { coverUrl: downloadUrl, source };
      } catch (storageErr) {
        console.warn('Firebase Storage upload failed, falling back to data URL:', storageErr);
        return { coverUrl: rawImageUrl, source };
      }
    }

    return { coverUrl: rawImageUrl, source };
  }
};

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
  orderBy, 
  serverTimestamp,
  increment,
  addDoc
} from "firebase/firestore";
import { db, auth } from "./lib/firebase";
import { User, Lesson, Feedback } from "./types";

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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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
      // Simplification: just get other users for now, filtering logic can be app-side or more complex query
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
      
      // Filter out completed matches in-memory
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

  async completeLesson(userId: string, lessonId: string) {
    const path = `users/${userId}/lesson_completions/${lessonId}`;
    try {
      const completionRef = doc(db, "users", userId, "lesson_completions", lessonId);
      const snap = await getDoc(completionRef);
      if (snap.exists()) return { success: true, alreadyCompleted: true };

      await setDoc(completionRef, {
        user_id: userId,
        lesson_id: lessonId,
        completed_at: new Date().toISOString()
      });

      await updateDoc(doc(db, "users", userId), {
        points: increment(10),
        completed_lessons_count: increment(1)
      });

      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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
  }
};

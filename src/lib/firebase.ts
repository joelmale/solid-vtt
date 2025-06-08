// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ---- Firebase config ----
const firebaseConfig = {
  apiKey: "AIzaSyB4t3dwMjaA2j19DOoBC_kc_4bHCJQ-Hoc",
  authDomain: "solid-vtt.firebaseapp.com",
  projectId: "solid-vtt",
  storageBucket: "solid-vtt.firebasestorage.app",
  messagingSenderId: "604866740762",
  appId: "1:604866740762:web:89495c835d343b314487a3",
  measurementId: "G-SXD2LQ29BV",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ---- Types ----
export type Point = { x: number; y: number };

export type Shape =
  | { id?: string; type: "line"; x: number; y: number; x2: number; y2: number }
  | { id?: string; type: "square"; x: number; y: number; w: number; h: number }
  | { id?: string; type: "circle"; cx: number; cy: number; rx: number; ry: number }
  | { id?: string; type: "cone"; tip: Point; baseLeft: Point; baseRight: Point }
  | { id?: string; type: "polygon"; points: Point[] }
  | { id?: string; type: "note"; x: number; y: number; text: string }
  | { id?: string; type: "measure"; x: number; y: number; x2: number; y2: number };

// ---- Save shape to a scene ----
export async function saveShapeToScene(sceneId: string, shape: Shape) {
  const shapeWithMeta = {
    ...shape,
    createdAt: Timestamp.now(),
    visible: true,
  };

  const ref = collection(db, `scenes/${sceneId}/elements`);
  await addDoc(ref, shapeWithMeta);
}

// ---- Subscribe to shape updates in a scene ----
export function subscribeToShapesInScene(
  sceneId: string,
  callback: (shapes: Shape[]) => void
) {
  const q = query(collection(db, `scenes/${sceneId}/elements`), orderBy("createdAt"));
  return onSnapshot(q, (snapshot) => {
    const shapes: Shape[] = [];
    snapshot.forEach((docSnap) => {
      shapes.push({ id: docSnap.id, ...docSnap.data() } as Shape);
    });
    callback(shapes);
  });
}

// ---- Delete shapes from a scene ----
export async function deleteShapesFromScene(sceneId: string, shapes: Shape[]) {
  for (const shape of shapes) {
    if (shape.id) {
      const ref = doc(db, `scenes/${sceneId}/elements`, shape.id);
      await deleteDoc(ref);
    }
  }
}

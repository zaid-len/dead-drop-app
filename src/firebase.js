import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCHqDVBRnPOmWrigJfpnvAgT2sfWYXkAQM',
  authDomain: 'illumination-689e5.firebaseapp.com',
  projectId: 'illumination-689e5',
  storageBucket: 'illumination-689e5.firebasestorage.app',
  messagingSenderId: '469669133798',
  appId: '1:469669133798:web:caa467923223e27824ea27',
  measurementId: 'G-9TS03VQWP7'
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

function dropsCollection(threadCode) {
  return collection(db, 'threads', threadCode, 'drops')
}

export function sendDrop(threadCode, { text, sender, windowSeconds }) {
  return addDoc(dropsCollection(threadCode), {
    text,
    sender,
    windowSeconds,
    opened: false,
    createdAt: serverTimestamp()
  })
}

export function markOpened(threadCode, dropId) {
  return updateDoc(doc(db, 'threads', threadCode, 'drops', dropId), {
    opened: true,
    openedAt: serverTimestamp()
  })
}

export function destroyDrop(threadCode, dropId) {
  return deleteDoc(doc(db, 'threads', threadCode, 'drops', dropId))
}

export function subscribeToThread(threadCode, onChange) {
  const q = query(dropsCollection(threadCode), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      onChange(change.type, change.doc.id, change.doc.data())
    })
  })
}

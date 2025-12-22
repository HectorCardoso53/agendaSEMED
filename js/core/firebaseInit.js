// js/core/firebaseInit.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/9.21.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-auth.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/9.21.0/firebase-messaging.js";

// ⚠️ caminho relativo: estamos em js/core -> volta 2 níveis até a raiz, entra em config
import { firebaseConfig } from "../../config/firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const messaging = getMessaging(app);

export {
  app,
  db,
  auth,
  messaging,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  arrayUnion
};

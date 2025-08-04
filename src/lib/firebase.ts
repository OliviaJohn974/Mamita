// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "le-mamita",
  "appId": "1:491682563079:web:2e4877a3f9dcc26805d6a2",
  "storageBucket": "le-mamita.firebasestorage.app",
  "apiKey": "AIzaSyDOgroniS86SGHQBE74muYw4I5MDq7uBW4",
  "authDomain": "le-mamita.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "491682563079"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

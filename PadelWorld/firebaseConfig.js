// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDzUj_oEchJVHiH-Px198Uac-DohgJFvwQ",
  authDomain: "padelworld-233ce.firebaseapp.com",
  projectId: "padelworld-233ce",
  storageBucket: "padelworld-233ce.firebasestorage.app",
  messagingSenderId: "381237872233",
  appId: "1:381237872233:web:2d4447f113984bb89944f8",
  measurementId: "G-LQLH06GPT5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

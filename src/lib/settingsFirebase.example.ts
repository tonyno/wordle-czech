// Import the functions you need from the SDKs you need
import { getAnalytics, isSupported, logEvent, Analytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "....", // https://console.cloud.google.com/apis/credentials?project=wordle-cz
  authDomain: "wordle-cz.firebaseapp.com",
  databaseURL:
    "https://wordle-cz-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wordle-cz",
  storageBucket: "wordle-cz.appspot.com",
  messagingSenderId: "....",
  appId: "....",
  measurementId: "....",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);

let analyticsInstance: Analytics | null = null;
isSupported().then((supported) => {
  if (supported) {
    analyticsInstance = getAnalytics(app);
  }
});

export const logMyEvent = (event: string, eventParam: string = "") => {
  if (analyticsInstance) {
    logEvent(analyticsInstance, event, { param1: eventParam });
  }
};

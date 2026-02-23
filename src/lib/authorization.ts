import { GoogleAuthProvider, User, signInWithPopup } from "firebase/auth";
import { saveGamesForLoggedUser } from "./dataAdapter";
import { auth } from "./settingsFirebase";

export const signInWithGoogle = async () => {
  // https://www.youtube.com/watch?v=2-LISBTczQE&t=27s
  const provider = new GoogleAuthProvider(); // https://firebase.google.com/docs/auth/web/google-signin#web-version-9
  try {
    await signInWithPopup(auth, provider); // https://firebase.google.com/docs/auth/web/google-signin#web-version-9
  } catch (error) {
    console.error(error);
  }
};

export const signOutUser = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error(error);
  }
};

export const saveGames = (user: User | undefined | null) => {
  if (user?.uid) {
    saveGamesForLoggedUser(user?.uid);
  }
};

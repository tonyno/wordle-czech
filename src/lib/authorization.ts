import {
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "./settingsFirebase";
import { getPlayerByGoogleUid, linkGoogleUid } from "./playerService";
import { mergeTokens } from "./playerService";
import { getToken, setToken, syncFirestoreToLocalStorage } from "./syncService";

export const signInWithGoogle = async (): Promise<{
  success: boolean;
  switchedToken?: string;
}> => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const uid = result.user.uid;
    const currentToken = getToken();
    if (!currentToken) return { success: false };

    // Check if this Google account already has a player
    const existing = await getPlayerByGoogleUid(uid);
    if (existing) {
      // Merge current token into existing token and switch
      if (existing.token !== currentToken) {
        await mergeTokens(currentToken, existing.token);
        setToken(existing.token);
        await syncFirestoreToLocalStorage(existing.token);
        return { success: true, switchedToken: existing.token };
      }
      return { success: true };
    }

    // Link current token to this Google UID
    await linkGoogleUid(currentToken, uid);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
};

const EMAIL_STORAGE_KEY = "emailForSignIn";

export const sendEmailLink = async (email: string): Promise<boolean> => {
  try {
    const actionCodeSettings = {
      url: window.location.origin + "/settings",
      handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    localStorage.setItem(EMAIL_STORAGE_KEY, email);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const completeEmailLinkSignIn = async (): Promise<{
  success: boolean;
  switchedToken?: string;
} | null> => {
  if (!isSignInWithEmailLink(auth, window.location.href)) {
    return null;
  }

  let email = localStorage.getItem(EMAIL_STORAGE_KEY);
  if (!email) {
    email = window.prompt("Zadejte e-mail pro dokončení přihlášení:");
  }
  if (!email) return { success: false };

  try {
    const result = await signInWithEmailLink(auth, email, window.location.href);
    localStorage.removeItem(EMAIL_STORAGE_KEY);

    // Clean up URL query params
    const url = new URL(window.location.href);
    url.search = "";
    window.history.replaceState({}, "", url.toString());

    const uid = result.user.uid;
    const currentToken = getToken();
    if (!currentToken) return { success: false };

    // Same merge-or-link logic as Google sign-in
    const existing = await getPlayerByGoogleUid(uid);
    if (existing) {
      if (existing.token !== currentToken) {
        await mergeTokens(currentToken, existing.token);
        setToken(existing.token);
        await syncFirestoreToLocalStorage(existing.token);
        return { success: true, switchedToken: existing.token };
      }
      return { success: true };
    }

    await linkGoogleUid(currentToken, uid);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
};

export const signOutUser = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error(error);
  }
};

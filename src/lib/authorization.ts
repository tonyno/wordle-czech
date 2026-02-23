import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./settingsFirebase";
import { getPlayerByGoogleUid, linkGoogleUid } from "./playerService";
import { mergeTokens } from "./playerService";
import { getToken, setToken } from "./syncService";

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

export const signOutUser = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error(error);
  }
};

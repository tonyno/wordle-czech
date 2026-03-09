import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { firestore } from "./settingsFirebase";
import { getToken } from "./syncService";

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: ReturnType<typeof Timestamp.now>;
  url: string;
  userAgent: string;
}

const buildLogEntry = (
  level: LogLevel,
  message: string,
  data?: Record<string, unknown>
): LogEntry => ({
  level,
  message,
  data: data || {},
  timestamp: Timestamp.now(),
  url: window.location.href,
  userAgent: navigator.userAgent,
});

const writeLog = async (entry: LogEntry): Promise<void> => {
  const token = getToken();
  if (!token) return;

  const now = new Date();
  const ts = now.getFullYear()
    + "-" + String(now.getMonth() + 1).padStart(2, "0")
    + "-" + String(now.getDate()).padStart(2, "0")
    + " " + String(now.getHours()).padStart(2, "0")
    + ":" + String(now.getMinutes()).padStart(2, "0")
    + ":" + String(now.getSeconds()).padStart(2, "0")
    + "." + String(now.getMilliseconds()).padStart(4, "0");
  try {
    const logRef = doc(collection(firestore, "logs", token, "entries"), ts);
    await setDoc(logRef, entry);
  } catch {
    // Logging must never crash the app
  }
};

export const logInfo = (message: string, data?: Record<string, unknown>): void => {
  const entry = buildLogEntry("info", message, data);
  console.log(`[Log] ${message}`, data || "");
  writeLog(entry);
};

export const logWarn = (message: string, data?: Record<string, unknown>): void => {
  const entry = buildLogEntry("warn", message, data);
  console.warn(`[Log] ${message}`, data || "");
  writeLog(entry);
};

export const logError = (message: string, data?: Record<string, unknown>): void => {
  const entry = buildLogEntry("error", message, data);
  console.error(`[Log] ${message}`, data || "");
  writeLog(entry);
};

/**
 * Analyzes localStorage and logs the byte size of each key's value.
 */
export const logLocalStorageReport = (): void => {
  const report: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) || "";
    report[key] = new Blob([value]).size;
  }
  logInfo("localStorage report", { sizes: report });
};

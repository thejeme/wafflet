import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdefghkmnopqrstuvwxyz", 36);
let sessionUid;

export function getUid() {
  if (sessionUid) return sessionUid;
  try {
    sessionUid = localStorage.getItem("uid") || nanoid();
    localStorage.setItem("uid", sessionUid);
  } catch {
    // Keep the app usable when browser storage is unavailable.
    sessionUid = nanoid();
  }
  return sessionUid;
}

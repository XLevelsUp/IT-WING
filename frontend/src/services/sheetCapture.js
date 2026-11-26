import bcrypt from 'bcryptjs';

/**
 * Frontend-only mode (interim, until the backend is deployed).
 *
 * When VITE_SIGNUP_SHEET_URL is set at build time:
 *  - Signups are sent to a Google Apps Script web app ("Signups" tab).
 *  - Login skips authentication: the visitor's full name + mobile number are
 *    recorded ("Logins" tab) and they are taken straight to the portal.
 *
 * When it is not set, signup and login use the regular backend API.
 *
 * Signup passwords are never sent in plain text: they are bcrypt-hashed in the
 * browser (same format the backend stores in users.password), so collected
 * rows can later be imported into the database.
 */
export const SIGNUP_SHEET_URL = (import.meta.env.VITE_SIGNUP_SHEET_URL || '').trim();

export const isSheetSignupEnabled = Boolean(SIGNUP_SHEET_URL);
export const isFrontendOnlyMode = isSheetSignupEnabled;

const BCRYPT_ROUNDS = 10;

const postToSheet = async (payload, { keepalive = false } = {}) => {
  let response;
  try {
    // text/plain keeps this a "simple" CORS request (Apps Script cannot answer preflight).
    response = await fetch(SIGNUP_SHEET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      keepalive,
    });
  } catch {
    throw new Error('Network error. Please check your connection and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // fall through to generic error below
  }

  if (!response.ok || !data) {
    throw new Error('Details could not be submitted right now. Please try again later.');
  }
  if (!data.success) {
    throw new Error(data.message || 'Submission failed. Please check your details.');
  }
  return data;
};

export const submitSignupToSheet = async ({ password, ...details }) => {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return postToSheet({ type: 'signup', ...details, passwordHash });
};

export const logLoginToSheet = ({ name, phoneNumber, portal, website }) =>
  postToSheet({ type: 'login', name, phoneNumber, portal, website }, { keepalive: true });

export default submitSignupToSheet;

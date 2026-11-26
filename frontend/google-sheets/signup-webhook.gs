/**
 * Google Apps Script web app: receives signups and logins from the frontend
 * (frontend-only mode) and appends them to tabs of the bound Google Sheet.
 *
 *   type "signup" -> "Signups" tab (duplicate mobile numbers rejected)
 *   type "login"  -> "Logins" tab  (every login recorded)
 *
 * Setup: Extensions > Apps Script in the target sheet, paste this file,
 * then Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * Put the resulting /exec URL in VITE_SIGNUP_SHEET_URL for the frontend build.
 * After editing: Deploy > Manage deployments > Edit > Version: New version
 * (keeps the same URL).
 */

const SIGNUP_SHEET = {
  name: 'Signups',
  headers: [
    'Submitted At',
    'Full Name',
    'Mobile Number',
    'Paguthi',
    'Village',
    'Ward Number',
    'Ward',
    'Constituency',
    'Password Hash (bcrypt)',
    'Status',
  ],
  phoneColumn: 3,
};

const LOGIN_SHEET = {
  name: 'Logins',
  headers: ['Logged In At', 'Full Name', 'Mobile Number', 'Portal'],
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    let data;
    try {
      data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (err) {
      return jsonResponse({ success: false, message: 'Invalid request.' });
    }

    // Honeypot filled in: pretend success, store nothing
    if (data.website) {
      return jsonResponse({ success: true });
    }

    // Requests without a type come from the original signup form
    const type = data.type || 'signup';
    if (type === 'login') return handleLogin(data);
    if (type === 'signup') return handleSignup(data);
    return jsonResponse({ success: false, message: 'Invalid request.' });
  } catch (err) {
    console.error(err);
    return jsonResponse({ success: false, message: 'Server busy. Please try again.' });
  } finally {
    lock.releaseLock();
  }
}

function handleSignup(data) {
  const name = cleanText(data.name, 150);
  const phone = cleanPhone(data.phoneNumber);
  const paguthi = cleanText(data.paguthi, 100);
  const village = cleanText(data.village, 150);
  const wardNumber = String(data.wardNumber || '').replace(/\D/g, '').slice(0, 5);
  const ward = cleanText(data.assignedWard, 150);
  const constituency = cleanText(data.constituency, 100);
  const passwordHash = String(data.passwordHash || '');

  if (!name) return jsonResponse({ success: false, message: 'Full name is required.' });
  if (!isValidPhone(phone)) {
    return jsonResponse({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
  }
  if (!paguthi) return jsonResponse({ success: false, message: 'Paguthi selection is required.' });
  if (!wardNumber) return jsonResponse({ success: false, message: 'Ward selection is required.' });
  // Only accept bcrypt hashes, never plain-text passwords
  if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(passwordHash)) {
    return jsonResponse({ success: false, message: 'Invalid request.' });
  }

  const sheet = getSheet(SIGNUP_SHEET);

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const existing = sheet
      .getRange(2, SIGNUP_SHEET.phoneColumn, lastRow - 1, 1)
      .getValues()
      .map(function (r) { return String(r[0]).replace(/\D/g, ''); });
    if (existing.indexOf(phone) !== -1) {
      return jsonResponse({
        success: false,
        message: 'An account with this phone number is already registered.',
      });
    }
  }

  sheet.appendRow([
    new Date(),
    asText(name),
    asText(phone),
    asText(paguthi),
    asText(village),
    asText(wardNumber),
    asText(ward),
    asText(constituency),
    asText(passwordHash),
    'Pending',
  ]);

  return jsonResponse({ success: true, message: 'Registration received.' });
}

function handleLogin(data) {
  const name = cleanText(data.name, 150);
  const phone = cleanPhone(data.phoneNumber);
  const portal = cleanText(data.portal, 100);

  if (!name) return jsonResponse({ success: false, message: 'Full name is required.' });
  if (!isValidPhone(phone)) {
    return jsonResponse({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
  }

  getSheet(LOGIN_SHEET).appendRow([new Date(), asText(name), asText(phone), asText(portal)]);

  return jsonResponse({ success: true });
}

// Lets you open the /exec URL in a browser to confirm the deployment is live
function doGet() {
  return jsonResponse({ success: true, status: 'ok' });
}

function getSheet(config) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(config.name);
  if (!sheet) {
    sheet = ss.insertSheet(config.name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(config.headers);
    sheet.getRange(1, 1, 1, config.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function cleanText(value, maxLen) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

function cleanPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

// Leading apostrophe stores the value as literal text: keeps phone numbers
// intact and stops values like "=HYPERLINK(...)" being run as formulas.
function asText(value) {
  return value === '' ? '' : "'" + value;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

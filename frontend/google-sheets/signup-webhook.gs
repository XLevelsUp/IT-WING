/**
 * Google Apps Script web app: receives signups and logins from the frontend
 * (frontend-only mode) and appends them to tabs of the bound Google Sheet.
 *
 *   type "signup" -> "Signups" tab (duplicate mobile numbers rejected)
 *   type "login"  -> "Logins" tab  (every login recorded)
 *
 * Setup: create this from the sheet itself (Extensions > Apps Script), paste
 * this file, run "setup" once from the editor, then
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 * Put the resulting /exec URL in VITE_SIGNUP_SHEET_URL for the frontend build.
 * After editing: Deploy > Manage deployments > Edit > Version: New version
 * (keeps the same URL).
 *
 * Optional WhatsApp alert for every new signup (via the free CallMeBot API):
 * Project Settings > Script Properties > add property
 *   CALLMEBOT_RECIPIENTS = <phone with country code>:<api key>
 *   e.g. 919876543210:1234567   (several recipients: separate with commas)
 * Then run "testWhatsApp" once from the editor to authorise and check it.
 * If the property is missing or the alert fails, the signup is still saved.
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

const WHATSAPP_RECIPIENTS_PROPERTY = 'CALLMEBOT_RECIPIENTS';

/**
 * Run this once from the Apps Script editor (select "setup" > Run).
 * It grants permissions and creates both tabs with headers.
 */
function setup() {
  getSheet(SIGNUP_SHEET);
  getSheet(LOGIN_SHEET);
  console.log('Setup complete: "' + SIGNUP_SHEET.name + '" and "' + LOGIN_SHEET.name + '" tabs are ready.');
}

function doPost(e) {
  try {
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

  // The lock only guards the duplicate check against two simultaneous signups
  // with the same number. If it cannot be obtained quickly, carry on without it
  // rather than losing the registration.
  const submittedAt = new Date();
  const lock = LockService.getScriptLock();
  const locked = lock.tryLock(5000);
  try {
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
      submittedAt,
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
    SpreadsheetApp.flush();
  } finally {
    if (locked) lock.releaseLock();
  }

  // The row is already saved; a WhatsApp problem must never fail the signup
  try {
    notifySignupOnWhatsApp({
      submittedAt: submittedAt,
      name: name,
      phone: phone,
      paguthi: paguthi,
      village: village,
      wardNumber: wardNumber,
      ward: ward,
      constituency: constituency,
    });
  } catch (err) {
    console.error('WhatsApp alert failed: ' + err);
  }

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

  // appendRow is atomic on its own, so logins need no lock
  getSheet(LOGIN_SHEET).appendRow([new Date(), asText(name), asText(phone), asText(portal)]);

  return jsonResponse({ success: true });
}

/**
 * Run this once from the Apps Script editor after adding the
 * CALLMEBOT_RECIPIENTS script property. It grants the "connect to an external
 * service" permission and sends a test message; check the execution log.
 */
function testWhatsApp() {
  if (!getWhatsAppRecipients().length) {
    throw new Error(
      'Add the ' + WHATSAPP_RECIPIENTS_PROPERTY +
      ' script property first (Project Settings > Script Properties), e.g. 919876543210:1234567'
    );
  }
  sendWhatsAppMessages('*Test message*\nWhatsApp alerts for new registrations are working.', true);
}

function notifySignupOnWhatsApp(d) {
  if (!getWhatsAppRecipients().length) return;

  const lines = ['*New account registration*', 'Name: ' + d.name, 'Mobile: ' + d.phone];
  if (d.paguthi) lines.push('Paguthi: ' + d.paguthi);
  if (d.village) lines.push('Village: ' + d.village);
  if (d.wardNumber || d.ward) {
    lines.push('Ward: ' + [d.wardNumber, d.ward].filter(String).join(' - '));
  }
  if (d.constituency) lines.push('Constituency: ' + d.constituency);
  lines.push('Time: ' + Utilities.formatDate(d.submittedAt, getSpreadsheet().getSpreadsheetTimeZone(), 'dd MMM yyyy, hh:mm a'));

  sendWhatsAppMessages(lines.join('\n'), false);
}

// Reads "phone:apikey" pairs (comma separated) from the script properties
function getWhatsAppRecipients() {
  const raw = PropertiesService.getScriptProperties().getProperty(WHATSAPP_RECIPIENTS_PROPERTY) || '';
  return raw
    .split(',')
    .map(function (entry) {
      const parts = entry.split(':');
      return {
        phone: String(parts[0] || '').replace(/\D/g, ''),
        apiKey: String(parts[1] || '').trim(),
      };
    })
    .filter(function (r) { return r.phone && r.apiKey; });
}

// Sends to all recipients in parallel; failures are logged, never thrown
function sendWhatsAppMessages(text, logResponses) {
  const recipients = getWhatsAppRecipients();
  if (!recipients.length) return;

  const responses = UrlFetchApp.fetchAll(recipients.map(function (r) {
    return {
      url: 'https://api.callmebot.com/whatsapp.php' +
        '?phone=' + encodeURIComponent('+' + r.phone) +
        '&text=' + encodeURIComponent(text) +
        '&apikey=' + encodeURIComponent(r.apiKey),
      muteHttpExceptions: true,
    };
  }));

  responses.forEach(function (res, i) {
    const code = res.getResponseCode();
    const body = res.getContentText().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
    if (code !== 200) {
      console.error('WhatsApp alert to recipient ' + (i + 1) + ' failed (HTTP ' + code + '): ' + body);
    } else if (logResponses) {
      console.log('Recipient ' + (i + 1) + ': ' + body);
    }
  });
}

// Lets you open the /exec URL in a browser to confirm the deployment is live
function doGet() {
  return jsonResponse({ success: true, status: 'ok' });
}

function getSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      'No spreadsheet attached. Create this script from the sheet via Extensions > Apps Script.'
    );
  }
  return ss;
}

function getSheet(config) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(config.name);
  if (!sheet) {
    try {
      sheet = ss.insertSheet(config.name);
    } catch (err) {
      // Another request created it at the same moment
      sheet = ss.getSheetByName(config.name);
      if (!sheet) throw err;
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]).setFontWeight('bold');
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

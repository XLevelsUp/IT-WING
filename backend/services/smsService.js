/**
 * SMS alerts sent through textbee (https://textbee.dev), which delivers SMS
 * from an Android phone's SIM card via the textbee app.
 *
 * Environment variables:
 *   TEXTBEE_API_KEY          required to turn SMS on (leave empty = SMS off)
 *   TEXTBEE_DEVICE_ID        optional: which registered phone sends the SMS
 *                            (default: your default / most recently active device)
 *   GRIEVANCE_SMS_TEMPLATE   optional: message sent after a grievance is registered.
 *                            Placeholders: {name} {token} {title} {category} {ward} {date}
 *                            Write \n for a new line.
 *
 * Every SMS is best-effort: failures are logged and never affect the request.
 */

const TEXTBEE_SEND_URL = 'https://api.textbee.dev/api/v1/gateway/send-sms';
const REQUEST_TIMEOUT_MS = 15000;

const DEFAULT_GRIEVANCE_TEMPLATE =
  'Your Complaint has been Registered Successfully. The Concerned Ward In-charge will Contact You Soon.\n\n' +
  'Thank you!\n\n' +
  'தங்களது புகார் வெற்றிகரமாகப் பதிவு செய்யப்பட்டுள்ளது. விரைவில் சம்பந்தப்பட்ட வார்டு பொறுப்பாளர் தங்களைத் தொடர்புகொண்டு உரிய நடவடிக்கைகள் மேற்கொள்வார்.\n\n' +
  'நன்றி!';

export const isSmsEnabled = () => Boolean((process.env.TEXTBEE_API_KEY || '').trim());

// Accepts 10-digit Indian mobiles (optionally with +91 / 91 / 0 prefix) and returns +91XXXXXXXXXX
export const toIndianMobile = (raw) => {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
};

export const fillTemplate = (template, values) =>
  String(template)
    .replace(/\\n/g, '\n')
    .replace(/\{(\w+)\}/g, (match, key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? '') : match
    );

export const sendSms = async (phone, message) => {
  const apiKey = (process.env.TEXTBEE_API_KEY || '').trim();
  if (!apiKey) throw new Error('TEXTBEE_API_KEY is not set');

  const recipient = toIndianMobile(phone);
  if (!recipient) throw new Error('Invalid mobile number');

  const body = { recipients: [recipient], message };
  const deviceId = (process.env.TEXTBEE_DEVICE_ID || '').trim();
  if (deviceId) body.deviceId = deviceId;

  const response = await fetch(TEXTBEE_SEND_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // non-JSON reply: reported below
  }

  if (!response.ok) {
    const reason = data?.message || data?.error || text.slice(0, 200) || response.statusText;
    throw new Error(`textbee HTTP ${response.status}: ${typeof reason === 'string' ? reason : JSON.stringify(reason)}`);
  }
  return data?.data || data;
};

const maskPhone = (phone) => String(phone).replace(/\d(?=\d{4})/g, '*');

// Fire-and-forget: call without await; never throws
export const sendGrievanceRegisteredSms = (issue, user) => {
  if (!isSmsEnabled() || !issue) return;

  const phone = issue.citizenMobile || user?.phone || '';
  if (!toIndianMobile(phone)) {
    console.warn(`[SMS] Skipped for ${issue.issueCode}: no valid mobile number`);
    return;
  }

  const message = fillTemplate(process.env.GRIEVANCE_SMS_TEMPLATE || DEFAULT_GRIEVANCE_TEMPLATE, {
    name: issue.citizenName || user?.name || 'Citizen',
    token: issue.issueCode || '',
    title: issue.title || '',
    category: issue.category || '',
    ward: issue.wardNumber ? `Ward ${issue.wardNumber}` : '',
    date: new Date(issue.createdAt || Date.now()).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
  });

  sendSms(phone, message)
    .then((result) =>
      console.log(`[SMS] Queued for ${issue.issueCode} to ${maskPhone(phone)}`, result?.smsBatchId ? `(batch ${result.smsBatchId})` : '')
    )
    .catch((err) => console.error(`[SMS] Failed for ${issue.issueCode} to ${maskPhone(phone)}: ${err.message}`));
};

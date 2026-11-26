/**
 * Paguthi / Ondriyam / Nagaram / Peruratchi & Municipal Ward Configuration
 * TVK Digital Governance CRM
 */

export const PAGUTHI_LABEL = 'Paguthi / Ondriyam / Nagaram / Peruratchi';

export const PAGUTHI_OPTIONS = [
  'Thondamuthur Therkku Ondriyam',
  'Thondamuthur Merkku Ondriyam',
  'Madukkarai Therkku Ondriyam',
  'Madukkarai Merkku Ondriyam',
  'Madukkarai Nagaram',
  'Vellalur Nagaram',
  'Kinathukadavu Ondriyam',
  'Malumachampatti',
  'Pothanur',
  'Kurichi',
  'Sundarapuram',
];

export const PAGUTHI_VILLAGES_MAP = {
  'Thondamuthur Therkku Ondriyam': [
    'Perur Chettipalayam'
  ],
  'Thondamuthur Therku Ondriyam': [
    'Perur Chettipalayam'
  ],
  'Thondamuthur Merkku Ondriyam': [
    'Theethipalayam',
    'Madhampatti'
  ],
  'Thondamuthur Merku Ondriyam': [
    'Theethipalayam',
    'Madhampatti'
  ],
  'Madukkarai Therkku Ondriyam': [
    'Arisipalayam',
    'Valukuparai',
    'Nachipalayam',
    'Myleripalayam',
    'Elur'
  ],
  'Madukarai Therku Ondriyam': [
    'Arisipalayam',
    'Valukuparai',
    'Nachipalayam',
    'Myleripalayam',
    'Elur'
  ],
  'Madukkarai Merkku Ondriyam': [
    'Chettipalayam',
    'Othakalmandapam',
    'Ettimadai',
    'Tirumalaipalayam',
    'Palathurai',
    'Pichanur',
    'Mavuthampathy'
  ],
  'Madukarai Merku Ondriyam': [
    'Chettipalayam',
    'Othakalmandapam',
    'Ettimadai',
    'Tirumalaipalayam',
    'Palathurai',
    'Pichanur',
    'Mavuthampathy'
  ],
  'Kinathukadavu Ondriyam': [
    'Vadaputhur',
    'Solavampalayam',
    'Sokkanur',
    'No.10 Muthur',
    'Kodangipalayam',
    'Kuthirayampalayam',
    'Pottayandipurambu'
  ],
  'Madukkarai Nagaram': [],
  'Vellalur Nagaram': [],
  'Malumachampatti': [
    'Seerapalayam',
    'Malumachampatti'
  ],
  'Malumichampatti': [
    'Seerapalayam',
    'Malumachampatti'
  ],
  'Pothanur': [],
  'Kurichi': [],
  'Sundarapuram': []
};

/**
 * Normalizes Paguthi names across single/double 'k' variations and aliases
 */
export const normalizePaguthiName = (name) => {
  if (!name) return '';
  const s = String(name).trim();
  if (/^thondamuthur\s+therk?ku\s+ondriyam$/i.test(s)) return 'Thondamuthur Therkku Ondriyam';
  if (/^thondamuthur\s+merk?ku\s+ondriyam$/i.test(s)) return 'Thondamuthur Merkku Ondriyam';
  if (/^maduk?karai\s+merk?ku\s+ondriyam$/i.test(s)) return 'Madukkarai Merkku Ondriyam';
  if (/^maduk?karai\s+therk?ku\s+ondriyam$/i.test(s)) return 'Madukkarai Therkku Ondriyam';
  if (/^malum[ia]champatti$/i.test(s)) return 'Malumachampatti';
  if (/^kinathukadavu\s+ondriyam$/i.test(s)) return 'Kinathukadavu Ondriyam';
  if (/^maduk?karai\s+nagaram$/i.test(s)) return 'Madukkarai Nagaram';
  if (/^vellalur\s+nagaram$/i.test(s)) return 'Vellalur Nagaram';
  if (/^pothanur$/i.test(s) || /^podanur$/i.test(s)) return 'Pothanur';
  if (/^kurichi$/i.test(s)) return 'Kurichi';
  if (/^sundarapuram$/i.test(s)) return 'Sundarapuram';
  return s;
};

/**
 * Returns allowed villages for a given Paguthi
 */
export const getVillagesForPaguthi = (paguthi) => {
  if (!paguthi) return [];
  const normalized = normalizePaguthiName(paguthi);
  return PAGUTHI_VILLAGES_MAP[normalized] || [];
};

/**
 * Validates if a village is valid for a selected Paguthi
 */
export const isVillageValidForPaguthi = (paguthi, village) => {
  const allowed = getVillagesForPaguthi(paguthi);
  const cleanVillage = (village || '').trim();

  if (allowed.length === 0) {
    return cleanVillage === '';
  }

  if (!cleanVillage) {
    return false;
  }

  return allowed.some((v) => v.toLowerCase() === cleanVillage.toLowerCase());
};

const EXCLUDED_WARDS_FOR_REMAINING = new Set([85, 94, 95, 96, 97, 98, 99, 100]);

// 92 wards: 1 through 84, and 86 through 93 (excluding 85, 94, 95, 96, 97, 98, 99, 100)
const REMAINING_TEN_WARDS = [];
for (let i = 1; i <= 100; i++) {
  if (!EXCLUDED_WARDS_FOR_REMAINING.has(i)) {
    REMAINING_TEN_WARDS.push(i);
  }
}

/**
 * Returns the exact allowed ward numbers for a selected Paguthi / Local Body.
 * 
 * Special Mappings:
 * - Pothanur: ONLY Ward 95, Ward 99, Ward 100 (Count: 3)
 * - Sundarapuram: ONLY Ward 94, Ward 96 (Count: 2)
 * - Kurichi: ONLY Ward 85, Ward 96, Ward 98 (Count: 3)
 * 
 * Remaining options:
 * - Ward 1 through Ward 100, excluding 85, 94, 95, 96, 97, 98, 99, 100 (Count: 92)
 */
export const getWardsForPaguthi = (paguthi) => {
  if (!paguthi) return [];
  const p = normalizePaguthiName(paguthi);
  if (p === 'Pothanur' || paguthi === 'Podanur') {
    return [95, 99, 100];
  }
  if (p === 'Sundarapuram') {
    return [94, 96];
  }
  if (p === 'Kurichi') {
    return [85, 96, 98];
  }
  if (p === 'Malumachampatti' || paguthi === 'Malumichampatti') {
    return [95, ...REMAINING_TEN_WARDS];
  }
  return REMAINING_TEN_WARDS;
};

/**
 * Validates if a ward belongs to the specified Paguthi.
 */
export const isWardValidForPaguthi = (paguthi, wardNum) => {
  if (!paguthi) return false;
  const parsed = parseInt(String(wardNum).replace(/\D+/g, ''), 10);
  if (isNaN(parsed)) return false;
  const allowed = getWardsForPaguthi(paguthi);
  return allowed.includes(parsed);
};

export default {
  PAGUTHI_LABEL,
  PAGUTHI_OPTIONS,
  PAGUTHI_VILLAGES_MAP,
  normalizePaguthiName,
  getVillagesForPaguthi,
  isVillageValidForPaguthi,
  getWardsForPaguthi,
  isWardValidForPaguthi,
};

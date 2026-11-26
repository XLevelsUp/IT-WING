/**
 * Paguthi / Ondriyam / Nagaram & Village / Municipal Ward Configuration
 * TVK Digital Governance CRM - Backend Utility
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
 * - If the Paguthi has mapped villages, village MUST be one of those allowed villages.
 * - If the Paguthi does NOT have mapped villages, village must be empty ('') or omitted.
 */
export const isVillageValidForPaguthi = (paguthi, village) => {
  const allowed = getVillagesForPaguthi(paguthi);
  const cleanVillage = (village || '').trim();

  if (allowed.length === 0) {
    // Paguthi has no mapped villages: only empty village is allowed
    return cleanVillage === '';
  }

  // Paguthi has mapped villages: village must be in allowed list (case-insensitive match)
  if (!cleanVillage) {
    return false;
  }

  return allowed.some((v) => v.toLowerCase() === cleanVillage.toLowerCase());
};

export const getCanonicalTargetPaguthis = (pName) => {
  const norm = normalizePaguthiName(pName);
  if (norm === 'Pothanur' || pName === 'Podanur') return ['Pothanur', 'Podanur'];
  if (norm === 'Kurichi') return ['Kurichi'];
  if (norm === 'Sundarapuram') return ['Sundarapuram'];
  if (norm === 'Malumachampatti') return ['Malumachampatti', 'Malumichampatti'];
  if (norm === 'Thondamuthur Therkku Ondriyam' || norm === 'Thondamuthur Therku Ondriyam') {
    return ['Thondamuthur Therkku Ondriyam', 'Thondamuthur Therku Ondriyam'];
  }
  if (norm === 'Thondamuthur Merkku Ondriyam' || norm === 'Thondamuthur Merku Ondriyam') {
    return ['Thondamuthur Merkku Ondriyam', 'Thondamuthur Merku Ondriyam'];
  }
  if (norm === 'Madukkarai Therkku Ondriyam' || norm === 'Madukarai Therku Ondriyam') {
    return ['Madukkarai Therkku Ondriyam', 'Madukarai Therku Ondriyam', 'Madukkarai Therku Ondriyam'];
  }
  if (norm === 'Madukkarai Merkku Ondriyam' || norm === 'Madukarai Merku Ondriyam') {
    return ['Madukkarai Merkku Ondriyam', 'Madukarai Merku Ondriyam', 'Madukkarai Merku Ondriyam'];
  }
  if (norm === 'Kinathukadavu Ondriyam') return ['Kinathukadavu Ondriyam'];
  if (norm === 'Madukkarai Nagaram') return ['Madukkarai Nagaram'];
  if (norm === 'Vellalur Nagaram') return ['Vellalur Nagaram'];
  return [norm || pName];
};

export default {
  PAGUTHI_LABEL,
  PAGUTHI_OPTIONS,
  PAGUTHI_VILLAGES_MAP,
  normalizePaguthiName,
  getVillagesForPaguthi,
  isVillageValidForPaguthi,
  getCanonicalTargetPaguthis,
};

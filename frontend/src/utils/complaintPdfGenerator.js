import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Helper translations for standard CRM terms to Tamil
const DISTRICT_MAP_TA = {
  Coimbatore: 'கோயம்புத்தூர்',
  coimbatore: 'கோயம்புத்தூர்',
};

const CONSTITUENCY_MAP_TA = {
  Kinathukadavu: 'கிணத்துக்கடவு',
  Pollachi: 'பொள்ளாச்சி',
  Sulur: 'சூலூர்',
  Singanallur: 'சிங்கநல்லூர்',
  'Coimbatore South': 'கோயம்புத்தூர் தெற்கு',
  'Coimbatore North': 'கோயம்புத்தூர் வடக்கு',
  Thondamuthur: 'தொண்டாமுத்தூர்',
  Kavundampalayam: 'கவுண்டம்பாளையம்',
  Mettupalayam: 'மேட்டுப்பாளையம்',
  Valparai: 'வால்பாறை',
};

const PAGUTHI_MAP_TA = {
  'Kinathukadavu Ondriyam': 'கிணத்துக்கடவு ஒன்றியம்',
  'Kinathukadavu Nagaram': 'கிணத்துக்கடவு நகரம்',
  'Thondamuthur Therku Ondriyam': 'தொண்டாமுத்தூர் தெற்கு ஒன்றியம்',
  'Thondamuthur Therkku Ondriyam': 'தொண்டாமுத்தூர் தெற்கு ஒன்றியம்',
  'Thondamuthur Merku Ondriyam': 'தொண்டாமுத்தூர் மேற்கு ஒன்றியம்',
  'Thondamuthur Merkku Ondriyam': 'தொண்டாமுத்தூர் மேற்கு ஒன்றியம்',
  'Madukarai Merku Ondriyam': 'மதுக்கரை மேற்கு ஒன்றியம்',
  'Madukkarai Merkku Ondriyam': 'மதுக்கரை மேற்கு ஒன்றியம்',
  'Madukarai Therku Ondriyam': 'மதுக்கரை தெற்கு ஒன்றியம்',
  'Madukkarai Therkku Ondriyam': 'மதுக்கரை தெற்கு ஒன்றியம்',
  'Madukkarai Nagaram': 'மதுக்கரை நகரம்',
  'Vellalur Nagaram': 'வெள்ளலூர் நகரம்',
  Pothanur: 'போத்தனூர்',
  Podanur: 'போத்தனூர்',
  Kurichi: 'குறிச்சி',
  Sundarapuram: 'சுந்தராபுரம்',
  Malumachampatti: 'மலுமிச்சம்பட்டி',
  Malumichampatti: 'மலுமிச்சம்பட்டி',
  'Othakkalmandapam Peruratchi': 'ஒத்தக்கால்மண்டபம் பேரூராட்சி',
  'Chettipalayam Peruratchi': 'செட்டிபாளையம் பேரூராட்சி',
};

const VILLAGE_MAP_TA = {
  'Perur Chettipalayam': 'பேரூர் செட்டிபாளையம்',
  Theethipalayam: 'தீத்திபாளையம்',
  Madhampatti: 'மாதம்பட்டி',
  Vadaputhur: 'வடபுதூர்',
  Solavampalayam: 'சொலவம்பாளையம்',
  Sokkanur: 'சொக்கனூர்',
  'No.10 Muthur': 'எண்.10 முத்தூர்',
  Kodangipalayam: 'கோடங்கிபாளையம்',
  Kuthirayampalayam: 'குதிரையம்பாளையம்',
  Pottayandipurambu: 'பொட்டையாண்டிபுறம்பு',
  Chettipalayam: 'செட்டிபாளையம்',
  Othakalmandapam: 'ஒத்தக்கால்மண்டபம்',
  Ettimadai: 'எட்டிமடை',
  Tirumalaipalayam: 'திருமலையம்பாளையம்',
  Palathurai: 'பாலத்துறை',
  Pichanur: 'பிச்சனூர்',
  Mavuthampathy: 'மாவுத்தம்பதி',
  Arisipalayam: 'அரிசிபாளையம்',
  Valukuparai: 'வழுக்குப்பாறை',
  Nachipalayam: 'நாச்சிபாளையம்',
  Myleripalayam: 'மயிலேறிபாளையம்',
  Elur: 'ஏலூர்',
  Seerapalayam: 'சீரபாளையம்',
  Malumachampatti: 'மலுமிச்சம்பட்டி',
};

const CATEGORY_MAP_TA = {
  'Drinking Water': 'குடிநீர் விநியோகம்',
  'Street Lighting': 'தெருவிளக்கு பராமரிப்பு',
  'Street Lights': 'தெருவிளக்கு பராமரிப்பு',
  'Road Infrastructure': 'சாலை உள்கட்டமைப்பு',
  'Road Maintenance': 'சாலை பராமரிப்பு',
  'Roads & Transport': 'சாலை & போக்குவரத்து',
  'Sanitation / Drainage': 'சாக்கடை / கழிவுநீர் வடிகால்',
  'Public Health': 'பொது சுகாதாரம்',
  'Electricity / TANGEDCO': 'மின்சார வசதி (TANGEDCO)',
  Electricity: 'மின்சார வசதி',
  'Public Transport': 'பொதுப் போக்குவரத்து',
  'Solid Waste': 'திடக்கழிவு மேலாண்மை',
  Other: 'இதர பொதுக் குறைகள்',
};

const STATUS_MAP_TA = {
  New: 'புதிய புகார் (New)',
  Pending: 'பரிசீலனையில் உள்ளது (Pending)',
  Assigned: 'பொறுப்பாளருக்கு ஒதுக்கப்பட்டது (Assigned)',
  'Under Review': 'ஆய்வில் உள்ளது (Under Review)',
  'In Progress': 'நடவடிக்கையில் உள்ளது (In Progress)',
  Completed: 'தீர்வு காணப்பட்டது (Completed)',
  Resolved: 'தீர்வு காணப்பட்டது (Resolved)',
  Closed: 'முடிக்கப்பட்டது (Closed)',
  Rejected: 'நிராகரிக்கப்பட்டது (Rejected)',
};

const PRIORITY_MAP_TA = {
  Low: 'குறைந்த முன்னுரிமை (Low)',
  Medium: 'நடுத்தர முன்னுரிமை (Medium)',
  High: 'அதிக முன்னுரிமை (High)',
  Critical: 'அவசர முன்னுரிமை (Critical)',
};

const toTamilDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ta-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

const toEnglishDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Universal Bilingual Complaint PDF Generator
 * Supports:
 * - lang: 'ta' (Tamil PDF: TVK-Complaint-Tamil-<ID>.pdf)
 * - lang: 'en' (English PDF: TVK-Complaint-English-<ID>.pdf)
 *
 * Contains all 15 required fields:
 * 1. Complaint ID / Reference Number
 * 2. Registration Date
 * 3. Complainant Name
 * 4. Mobile Number
 * 5. District
 * 6. Constituency
 * 7. Paguthi / Ondriyam
 * 8. Village
 * 9. Ward Number
 * 10. Complaint Category
 * 11. Complaint Title
 * 12. Full Complaint Description
 * 13. Current Status
 * 14. Existing Assignment Details (assigned secretary, department, officer)
 * 15. Official TVK branding / receipt layout / verification
 */
export const downloadComplaintPdf = async (complaint, currentUser, lang = 'ta') => {
  if (!complaint) return;

  const isTa = lang === 'ta';
  const cData = complaint.issue || complaint;

  // 1. Complaint ID / Reference Number
  const issueCode = cData.issueCode || cData.complaintId || (cData.id ? `GRI-${cData.id}` : 'N/A');

  // 2. Registration Date
  const rawCreatedAt = cData.createdAt || cData.date || new Date().toISOString();
  const regDate = isTa ? toTamilDate(rawCreatedAt) : toEnglishDate(rawCreatedAt);

  // 3. Complainant Name
  const citizenName = cData.citizenName || currentUser?.name || (isTa ? 'பொதுமக்கள்' : 'Citizen');

  // 4. Mobile Number
  const citizenMobile = cData.citizenMobile || currentUser?.phone || (isTa ? 'கிடைக்கவில்லை' : 'N/A');

  // 5. District
  const rawDistrict = cData.district?.name || cData.district || 'Coimbatore';
  const district = isTa ? (DISTRICT_MAP_TA[rawDistrict] || rawDistrict) : rawDistrict;

  // 6. Constituency
  const rawConstituency = cData.constituency?.name || cData.constituencyName || cData.constituency || currentUser?.constituency || 'Kinathukadavu';
  const constituency = isTa ? (CONSTITUENCY_MAP_TA[rawConstituency] || rawConstituency) : rawConstituency;

  // 7. Paguthi / Ondriyam
  const rawPaguthi = cData.paguthi || cData.ward?.paguthi || currentUser?.paguthi || 'Kinathukadavu Ondriyam';
  const paguthi = isTa ? (PAGUTHI_MAP_TA[rawPaguthi] || rawPaguthi) : rawPaguthi;

  // 8. Village
  const rawVillage = cData.village || currentUser?.village || '';
  const village = isTa
    ? (rawVillage ? (VILLAGE_MAP_TA[rawVillage] || rawVillage) : 'பொருந்தாது (N/A)')
    : (rawVillage || 'Not Applicable (N/A)');

  // 9. Ward Number
  const rawWardNum = cData.ward?.wardNumber || cData.wardNumber || cData.wardId?.wardNumber || '';
  const cleanWardNum = String(rawWardNum).replace(/\D+/g, '');
  const wardDisplay = cleanWardNum
    ? (isTa ? `வார்டு ${cleanWardNum}` : `Ward ${cleanWardNum}`)
    : (isTa ? 'குறிப்பிடப்படவில்லை' : 'General / Not Assigned');

  // 10. Complaint Category
  const rawCategory = cData.category || 'Drinking Water';
  const category = isTa ? (CATEGORY_MAP_TA[rawCategory] || rawCategory) : rawCategory;

  // 11. Complaint Title
  const title = cData.title || (isTa ? 'பொது மக்கள் குறை' : 'Citizen Grievance');

  // 12. Full Complaint Description
  const description = cData.description || (isTa ? 'விவரம் வழங்கப்படவில்லை.' : 'No description provided.');

  // 13. Current Status
  const rawStatus = cData.status || 'New';
  const status = isTa ? (STATUS_MAP_TA[rawStatus] || rawStatus) : rawStatus;

  // Priority
  const rawPriority = cData.priority || 'Medium';
  const priority = isTa ? (PRIORITY_MAP_TA[rawPriority] || rawPriority) : rawPriority;

  // Address
  const citizenAddress = cData.citizenAddress || cData.address || cData.location || currentUser?.address || (isTa ? 'வழங்கப்படவில்லை' : 'Not Provided');

  // 14. Existing Assignment Details
  const assignedSecretary = cData.assignedWardSecretary?.name || cData.assignedWardSecretaryName || null;
  const secretaryPhone = cData.assignedWardSecretary?.phone || null;
  const assignedDepartment = cData.assignedDepartment || null;
  const officialDetails = assignedSecretary
    ? `${assignedSecretary}${secretaryPhone ? ` (${secretaryPhone})` : ''}${assignedDepartment ? ` • ${assignedDepartment}` : ''}`
    : assignedDepartment
    ? assignedDepartment
    : (isTa ? 'ஒதுக்கீடு பரிசீலனையில் உள்ளது (Under Assignment)' : 'Under Assignment Review');

  const actionTaken = cData.actionTaken || cData.finalReport || null;
  const wardRemarks = cData.wardSecretaryRemarks || null;
  const rawResolved = cData.completedAt || cData.resolvedAt;
  const resolvedDate = rawResolved ? (isTa ? toTamilDate(rawResolved) : toEnglishDate(rawResolved)) : null;

  // Multi-page check
  const isLengthy = description.length > 550 || Boolean(actionTaken || wardRemarks);
  const totalPages = isLengthy ? 2 : 1;

  let page1Desc = description;
  let page2Desc = '';
  if (isLengthy) {
    if (description.length > 550) {
      const splitIndex = description.lastIndexOf(' ', 500);
      page1Desc = description.slice(0, splitIndex > 0 ? splitIndex : 500) + (isTa ? '... (தொடர்ச்சி அடுத்த பக்கத்தில்)' : '... (Continued on next page)');
      page2Desc = description.slice(splitIndex > 0 ? splitIndex : 500).trim();
    } else {
      page1Desc = description;
      page2Desc = '';
    }
  }

  // Create temporary container for high-res rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // 210mm at 96 DPI
  container.style.zIndex = '-9999';
  container.style.fontFamily = isTa
    ? "'Noto Sans Tamil', 'Nirmala UI', 'Latha', 'Tamil Sangam MN', sans-serif"
    : "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const renderDate = isTa ? toTamilDate(new Date()) : toEnglishDate(new Date());

  // Page 1 HTML
  const page1 = document.createElement('div');
  page1.style.width = '794px';
  page1.style.minHeight = '1123px';
  page1.style.height = '1123px';
  page1.style.boxSizing = 'border-box';
  page1.style.backgroundColor = '#ffffff';
  page1.style.color = '#1f2937';
  page1.style.display = 'flex';
  page1.style.flexDirection = 'column';
  page1.style.justifyContent = 'space-between';
  page1.style.padding = '32px 36px';
  page1.style.position = 'relative';

  // Localized Strings
  const L = isTa ? {
    headerTitle: 'தமிழ்நாடு வெற்றி கழகம் – Digital Governance',
    headerSubtitle: 'கோயம்புத்தூர் மாவட்டம் • மக்கள் குறைதீர்வு நிர்வாக அமைப்பு (Citizen Grievance Redressal)',
    headerNote: 'உத்தியோகபூர்வ டிஜிட்டல் ஆளுகை குறைதீர்ப்பு பதிவுத் தொகுதி',
    slipTitle: 'புகார் பதிவு ஒப்புகைச் சீட்டு',
    slipSubtitle: 'Official Complaint Acknowledgement Slip',
    refLabel: 'புகார் எண் / Reference No:',
    regDateLabel: 'புகார் பதிவு செய்த தேதி:',
    priorityLabel: 'முன்னுரிமை:',
    statusLabel: 'தற்போதைய நிலை:',
    sectionTitle: 'புகார் மற்றும் கள இருப்பிட விவரங்கள் (Grievance & Jurisdiction Details)',
    nameLabel: 'புகார் அளித்தவரின் பெயர்:',
    phoneLabel: 'பதிவு செய்யப்பட்ட மொபைல் எண்:',
    districtLabel: 'மாவட்டம்:',
    constituencyLabel: 'சட்டமன்றத் தொகுதி:',
    paguthiLabel: 'ஒன்றியம் / பகுதி (Paguthi):',
    villageLabel: 'கிராமம் (Village):',
    wardLabel: 'வார்டு எண்:',
    categoryLabel: 'புகார் வகை:',
    addressLabel: 'இருப்பிட முகவரி:',
    officerLabel: 'தொடர்புடைய ஒதுக்கீடு / அதிகாரி:',
    subjectLabel: 'புகார் தலைப்பு (Subject):',
    descLabel: 'புகாரின் முழு விவரம் (Detailed Grievance Description):',
    resTitle: 'கள நடவடிக்கை & தீர்வு விவரங்கள் (Field Resolution & Remarks):',
    actionLabel: 'மேற்கொள்ளப்பட்ட நடவடிக்கை:',
    remarksLabel: 'வார்டு செயலாளர் குறிப்பு:',
    resolvedDateLabel: 'தீர்வு நாள்:',
    pledge: 'டிஜிட்டல் ஆளுகை உறுதிமொழி: உங்கள் புகார் வெற்றிகரமாக TVK நிர்வாகத் தளத்தில் பதிவு செய்யப்பட்டு தொடர்புடைய வார்டு பொறுப்பாளர்களுக்கு ஒதுக்கீட்டிற்கு அனுப்பப்பட்டுள்ளது. உங்கள் பதிவு செய்யப்பட்ட கைபேசி எண் மூலம் எப்போது வேண்டுமானாலும் புகார் நிலையை நேரலையாகக் கண்காணிக்கலாம்.',
    footerAdmin: 'தமிழ்நாடு வெற்றி கழகம் (TVK) • கோயம்புத்தூர் மாவட்ட மத்திய தலைமை நிர்வாகம்',
    downloadOn: 'பதிவிறக்கம்:',
    page: 'பக்கம்',
    of: '/',
    sealVerified: 'TVK DIGITAL VERIFIED',
    sealSub: 'மின்னணு சரிபார்ப்பு பெற்றது',
    continued: 'தொடர்ச்சி',
    descContinued: 'புகாரின் தொடர்ச்சி (Grievance Description Continued):',
    certTitle: 'டிஜிட்டல் ஆளுகை உத்தியோகபூர்வ சான்றிதழ் (Digital Governance Certificate)',
    certDesc: 'இந்த ஆவணம் TVK டிஜிட்டல் ஆளுகை CRM தளம் மூலம் முறையாகப் பதிவு செய்யப்பட்டு களப் பணிகளுக்குப் பரிந்துரைக்கப்பட்ட மக்கள் குறையின் அதிகாரப்பூர்வ மின்னணு ஒப்புகைச் சீட்டு ஆகும். கணினியால் உருவாக்கப்பட்ட இந்த ஆவணத்திற்கு கையொப்பம் தேவையில்லை.',
    centerName: 'TVK கோயம்புத்தூர் மாவட்ட தகவல் மேலாண்மை மையம்',
  } : {
    headerTitle: 'TAMILAGA VETTRI KAZHAGAM – Digital Governance',
    headerSubtitle: 'Coimbatore District • Citizen Grievance Redressal Administration',
    headerNote: 'Official Digital Governance Grievance Redressal System',
    slipTitle: 'COMPLAINT ACKNOWLEDGEMENT SLIP',
    slipSubtitle: 'Official Citizen Grievance Redressal Record',
    refLabel: 'Complaint ID / Reference No:',
    regDateLabel: 'Registration Date:',
    priorityLabel: 'Priority:',
    statusLabel: 'Current Status:',
    sectionTitle: 'GRIEVANCE & JURISDICTION DETAILS',
    nameLabel: 'Complainant Name:',
    phoneLabel: 'Registered Mobile Number:',
    districtLabel: 'District:',
    constituencyLabel: 'Assembly Constituency:',
    paguthiLabel: 'Paguthi / Ondriyam:',
    villageLabel: 'Village:',
    wardLabel: 'Ward Number:',
    categoryLabel: 'Complaint Category:',
    addressLabel: 'Address / Location:',
    officerLabel: 'Assigned Officer / Secretary:',
    subjectLabel: 'Complaint Title (Subject):',
    descLabel: 'Detailed Complaint Description:',
    resTitle: 'Field Resolution & Ground Remarks:',
    actionLabel: 'Action Taken:',
    remarksLabel: 'Ward Secretary Remarks:',
    resolvedDateLabel: 'Resolution Date:',
    pledge: 'Digital Governance Redressal Note: This complaint has been successfully registered on the TVK Digital Governance platform and routed to the assigned local ward volunteer administration for field resolution. You can track live updates using your registered mobile number.',
    footerAdmin: 'Tamilaga Vettri Kazhagam (TVK) • Coimbatore District Central Administrative Unit',
    downloadOn: 'Generated on:',
    page: 'Page',
    of: 'of',
    sealVerified: 'TVK DIGITAL VERIFIED',
    sealSub: 'Official System Generated',
    continued: 'Continued',
    descContinued: 'Detailed Complaint Description (Continued):',
    certTitle: 'Official Digital Governance Certificate of Registration',
    certDesc: 'This official acknowledgement certificate verifies that the citizen grievance has been formally documented and queued for field execution under TVK Digital Governance. This is a computer-generated document requiring no physical signature.',
    centerName: 'TVK Coimbatore District Central Governance Center',
  };

  page1.innerHTML = `
    <div>
      <!-- Official Header Banner -->
      <div style="background: linear-gradient(135deg, #850000 0%, #A00000 50%, #850000 100%); padding: 16px 20px; border-radius: 12px; border-bottom: 4px solid #FFD32A; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; color: #ffffff;">
        <div style="font-size: 20px; font-weight: 800; color: #FFD32A; letter-spacing: 0.5px; margin-bottom: 4px;">
          ${L.headerTitle}
        </div>
        <div style="font-size: 11px; font-weight: 600; opacity: 0.95; letter-spacing: 0.3px;">
          ${L.headerSubtitle}
        </div>
        <div style="font-size: 9.5px; opacity: 0.85; margin-top: 2px;">
          ${L.headerNote}
        </div>
      </div>

      <!-- Document Title & Identification Strip -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding: 10px 14px; background: #FFF8F0; border: 1px solid #FFE5A3; border-radius: 10px;">
        <div>
          <div style="font-size: 13px; font-weight: 800; color: #A00000;">
            ${L.slipTitle}
          </div>
          <div style="font-size: 9.5px; color: #6b7280; margin-top: 1px;">
            ${L.slipSubtitle}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 9px; color: #6b7280;">${L.refLabel}</div>
          <div style="font-size: 14px; font-weight: 800; color: #A00000; font-family: monospace; letter-spacing: 0.5px;">
            ${issueCode}
          </div>
        </div>
      </div>

      <!-- Priority & Date Meta Bar -->
      <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 9.5px; padding: 6px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div><strong>${L.regDateLabel}</strong> ${regDate}</div>
        <div><strong>${L.priorityLabel}</strong> <span style="color: #A00000; font-weight: 700;">${priority}</span></div>
        <div><strong>${L.statusLabel}</strong> <span style="color: #047857; font-weight: 700;">${status}</span></div>
      </div>

      <!-- Comprehensive 2-Column Table of Complaint Details -->
      <div style="margin-top: 14px;">
        <div style="font-size: 10.5px; font-weight: 800; color: #850000; text-transform: uppercase; margin-bottom: 6px; border-left: 3px solid #FFD32A; padding-left: 6px;">
          ${L.sectionTitle}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #E9E2DC; border-radius: 8px; overflow: hidden;">
          <tbody>
            <tr style="border-bottom: 1px solid #E9E2DC;">
              <td style="width: 25%; padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.nameLabel}</td>
              <td style="width: 25%; padding: 7px 10px; font-weight: 600; color: #111827;">${citizenName}</td>
              <td style="width: 25%; padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.phoneLabel}</td>
              <td style="width: 25%; padding: 7px 10px; font-weight: 600; color: #111827; font-family: monospace;">${citizenMobile}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E9E2DC;">
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.districtLabel}</td>
              <td style="padding: 7px 10px; font-weight: 600; color: #111827;">${district}</td>
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.constituencyLabel}</td>
              <td style="padding: 7px 10px; font-weight: 600; color: #111827;">${constituency}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E9E2DC;">
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.paguthiLabel}</td>
              <td style="padding: 7px 10px; font-weight: 600; color: #111827;">${paguthi}</td>
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.villageLabel}</td>
              <td style="padding: 7px 10px; font-weight: 600; color: #166534;">${village}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E9E2DC;">
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.wardLabel}</td>
              <td style="padding: 7px 10px; font-weight: 600; color: #111827;">${wardDisplay}</td>
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.categoryLabel}</td>
              <td style="padding: 7px 10px; font-weight: 600; color: #A00000;">${category}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E9E2DC;">
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.addressLabel}</td>
              <td colspan="3" style="padding: 7px 10px; color: #374151;">${citizenAddress}</td>
            </tr>
            <tr>
              <td style="padding: 7px 10px; background: #FFF8F0; font-weight: 700; color: #374151;">${L.officerLabel}</td>
              <td colspan="3" style="padding: 7px 10px; font-weight: 600; color: #1e3a8a;">${officialDetails}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Grievance Subject / Title -->
      <div style="margin-top: 14px; background: #ffffff; border: 1px solid #E9E2DC; border-radius: 8px; padding: 9px 12px;">
        <div style="font-size: 9.5px; font-weight: 700; color: #850000; margin-bottom: 3px;">
          ${L.subjectLabel}
        </div>
        <div style="font-size: 11px; font-weight: 700; color: #111827;">
          ${title}
        </div>
      </div>

      <!-- Grievance Full Description -->
      <div style="margin-top: 12px; background: #ffffff; border: 1px solid #E9E2DC; border-radius: 8px; padding: 10px 12px;">
        <div style="font-size: 9.5px; font-weight: 700; color: #850000; margin-bottom: 4px;">
          ${L.descLabel}
        </div>
        <div style="font-size: 10px; line-height: 1.6; color: #374151; white-space: pre-wrap;">
          ${page1Desc}
        </div>
      </div>

      ${!isLengthy && (actionTaken || wardRemarks) ? `
      <!-- Single Page Field Resolution Section if present -->
      <div style="margin-top: 12px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 9px 12px;">
        <div style="font-size: 10px; font-weight: 800; color: #166534; margin-bottom: 4px;">
          ${L.resTitle}
        </div>
        ${actionTaken ? `<div style="font-size: 9.5px; color: #14532d; margin-bottom: 2px;"><strong>${L.actionLabel}</strong> ${actionTaken}</div>` : ''}
        ${wardRemarks ? `<div style="font-size: 9.5px; color: #14532d; margin-bottom: 2px;"><strong>${L.remarksLabel}</strong> ${wardRemarks}</div>` : ''}
        ${resolvedDate ? `<div style="font-size: 9px; color: #15803d;"><strong>${L.resolvedDateLabel}</strong> ${resolvedDate}</div>` : ''}
      </div>
      ` : ''}

      ${!isLengthy ? `
      <!-- Official TVK Verification Box -->
      <div style="margin-top: 14px; background: #FFF8F0; border: 1px dashed #FFD32A; border-radius: 8px; padding: 10px 12px; font-size: 8.5px; color: #78350f; line-height: 1.5;">
        <strong>TVK:</strong> ${L.pledge}
      </div>
      ` : ''}
    </div>

    <!-- Official Footer Page 1 -->
    <div style="margin-top: 16px; border-top: 1px solid #E5E7EB; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #6b7280;">
      <div>
        ${L.footerAdmin}
      </div>
      <div>
        ${L.downloadOn} ${renderDate} • ${L.page} 1 ${L.of} ${totalPages}
      </div>
    </div>
  `;

  container.appendChild(page1);

  // Page 2 HTML (if multi-page)
  let page2 = null;
  if (isLengthy) {
    page2 = document.createElement('div');
    page2.style.width = '794px';
    page2.style.minHeight = '1123px';
    page2.style.height = '1123px';
    page2.style.boxSizing = 'border-box';
    page2.style.backgroundColor = '#ffffff';
    page2.style.color = '#1f2937';
    page2.style.display = 'flex';
    page2.style.flexDirection = 'column';
    page2.style.justifyContent = 'space-between';
    page2.style.padding = '32px 36px';
    page2.style.position = 'relative';

    page2.innerHTML = `
      <div>
        <!-- Compact Header for Continued Page -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: #850000; color: #ffffff; padding: 10px 16px; border-radius: 8px; border-bottom: 3px solid #FFD32A;">
          <div>
            <span style="font-size: 13px; font-weight: 800; color: #FFD32A;">${L.headerTitle}</span>
            <span style="font-size: 10px; margin-left: 8px; opacity: 0.9;">(${L.continued})</span>
          </div>
          <div style="font-size: 11px; font-weight: 700; font-family: monospace;">
            ${issueCode}
          </div>
        </div>

        ${page2Desc ? `
        <!-- Continued Grievance Description -->
        <div style="margin-top: 16px; background: #ffffff; border: 1px solid #E9E2DC; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 800; color: #850000; margin-bottom: 6px;">
            ${L.descContinued}
          </div>
          <div style="font-size: 10px; line-height: 1.6; color: #374151; white-space: pre-wrap;">
            ${page2Desc}
          </div>
        </div>
        ` : ''}

        ${actionTaken || wardRemarks ? `
        <!-- Field Resolution & Administrative Actions -->
        <div style="margin-top: 16px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px 14px;">
          <div style="font-size: 11px; font-weight: 800; color: #166534; margin-bottom: 6px; border-left: 3px solid #22c55e; padding-left: 6px;">
            ${L.resTitle}
          </div>
          ${actionTaken ? `
          <div style="font-size: 10px; color: #14532d; margin-bottom: 5px;">
            <strong>${L.actionLabel}</strong><br/>
            <span style="display: block; margin-top: 2px; color: #1f2937;">${actionTaken}</span>
          </div>` : ''}
          ${wardRemarks ? `
          <div style="font-size: 10px; color: #14532d; margin-bottom: 5px;">
            <strong>${L.remarksLabel}</strong><br/>
            <span style="display: block; margin-top: 2px; color: #1f2937;">${wardRemarks}</span>
          </div>` : ''}
          ${resolvedDate ? `
          <div style="font-size: 9.5px; color: #15803d; margin-top: 6px;">
            <strong>${L.resolvedDateLabel}</strong> ${resolvedDate}
          </div>` : ''}
        </div>
        ` : ''}

        <!-- Official Seal and Authenticity Section -->
        <div style="margin-top: 24px; padding: 14px 16px; background: #FFF8F0; border: 1px solid #FFE5A3; border-radius: 10px;">
          <div style="font-size: 11px; font-weight: 800; color: #850000; margin-bottom: 4px;">
            ${L.certTitle}
          </div>
          <p style="font-size: 9px; line-height: 1.5; color: #4b5563; margin-bottom: 12px;">
            ${L.certDesc}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 10px; border-top: 1px dashed #e5e7eb;">
            <div style="font-size: 9px; color: #6b7280;">
              <div>${L.centerName}</div>
              <div>support@tvkcrm.org • tvk.governance.crm</div>
            </div>
            <div style="text-align: center; border: 2px solid #A00000; border-radius: 8px; padding: 6px 12px; color: #A00000; font-size: 9px; font-weight: 800;">
              ${L.sealVerified}<br/>
              <span style="font-size: 7.5px; font-weight: normal; color: #374151;">${L.sealSub}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Official Footer Page 2 -->
      <div style="margin-top: 16px; border-top: 1px solid #E5E7EB; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #6b7280;">
        <div>
          ${L.footerAdmin}
        </div>
        <div>
          ${L.downloadOn} ${renderDate} • ${L.page} 2 ${L.of} ${totalPages}
        </div>
      </div>
    `;

    container.appendChild(page2);
  }

  document.body.appendChild(container);

  try {
    // Wait for document fonts to load
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // High quality rasterization of Page 1
    const canvas1 = await html2canvas(page1, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgData1, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Page 2 if multi-page
    if (page2) {
      const canvas2 = await html2canvas(page2, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
      doc.addPage('a4', 'portrait');
      doc.addImage(imgData2, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    const cleanCode = String(issueCode).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = isTa
      ? `TVK-Complaint-Tamil-${cleanCode}.pdf`
      : `TVK-Complaint-English-${cleanCode}.pdf`;

    doc.save(fileName);
    return { success: true, fileName };
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
};

/**
 * Convenience method for Tamil complaint PDF
 */
export const downloadTamilComplaintPdf = (complaint, currentUser) => {
  return downloadComplaintPdf(complaint, currentUser, 'ta');
};

/**
 * Convenience method for English complaint PDF
 */
export const downloadEnglishComplaintPdf = (complaint, currentUser) => {
  return downloadComplaintPdf(complaint, currentUser, 'en');
};

export default {
  downloadComplaintPdf,
  downloadTamilComplaintPdf,
  downloadEnglishComplaintPdf,
};

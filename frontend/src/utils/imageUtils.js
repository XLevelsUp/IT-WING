/**
 * Utility functions for Complaint Images & Relational Field Resolution
 * Ensures strict separation between Before and After images, prevents broken URLs,
 * and normalizes paths across all CRM dashboards.
 */

export const getSafeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  // Remote URLs or data URIs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  // Absolute paths
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  // Relative uploads path e.g. "uploads/abc.jpg" -> "/uploads/abc.jpg"
  return `/${trimmed}`;
};

/**
 * Extracts ONLY the Before Image from a complaint record.
 * GUARANTEE: Never inspects afterImage or resolution fields.
 */
export const getBeforeImageUrl = (complaint) => {
  if (!complaint) return '';
  const direct = complaint.beforeImage || complaint.beforePhoto;
  if (direct && typeof direct === 'string' && direct.trim()) {
    return getSafeImageUrl(direct);
  }
  if (Array.isArray(complaint.beforeImages) && complaint.beforeImages.length > 0) {
    const img = complaint.beforeImages[0]?.imageUrl || complaint.beforeImages[0]?.url;
    if (img && typeof img === 'string' && img.trim()) return getSafeImageUrl(img);
  }
  if (Array.isArray(complaint.attachments) && complaint.attachments.length > 0) {
    const att = complaint.attachments[0]?.fileUrl || complaint.attachments[0]?.url;
    if (att && typeof att === 'string' && att.trim()) return getSafeImageUrl(att);
  }
  return '';
};

/**
 * Extracts ONLY the After Image from a complaint record.
 * GUARANTEE: Never inspects beforeImage or citizen attachment fields.
 */
export const getAfterImageUrl = (complaint) => {
  if (!complaint) return '';
  const direct = complaint.afterImage || complaint.afterPhoto;
  if (direct && typeof direct === 'string' && direct.trim()) {
    return getSafeImageUrl(direct);
  }
  if (Array.isArray(complaint.afterImages) && complaint.afterImages.length > 0) {
    const img = complaint.afterImages[0]?.imageUrl || complaint.afterImages[0]?.url;
    if (img && typeof img === 'string' && img.trim()) return getSafeImageUrl(img);
  }
  if (Array.isArray(complaint.actions) && complaint.actions.length > 0) {
    const actImg = complaint.actions[0]?.afterImage;
    if (actImg && typeof actImg === 'string' && actImg.trim()) return getSafeImageUrl(actImg);
  }
  return '';
};

export const getActionDescription = (complaint) => {
  if (!complaint) return '';
  if (complaint.actionTaken && String(complaint.actionTaken).trim()) {
    return String(complaint.actionTaken).trim();
  }
  if (complaint.finalReport && String(complaint.finalReport).trim()) {
    return String(complaint.finalReport).trim();
  }
  if (Array.isArray(complaint.actions) && complaint.actions[0]?.actionTaken) {
    return String(complaint.actions[0].actionTaken).trim();
  }
  if (complaint.resolutionDetails?.resolutionNotes) {
    return String(complaint.resolutionDetails.resolutionNotes).trim();
  }
  return '';
};

export const getWardSecretaryRemarks = (complaint) => {
  if (!complaint) return '';
  if (complaint.wardSecretaryRemarks && String(complaint.wardSecretaryRemarks).trim()) {
    return String(complaint.wardSecretaryRemarks).trim();
  }
  if (Array.isArray(complaint.actions) && complaint.actions[0]?.wardSecretaryRemarks) {
    return String(complaint.actions[0].wardSecretaryRemarks).trim();
  }
  if (complaint.adminRemarks && String(complaint.adminRemarks).trim()) {
    return String(complaint.adminRemarks).trim();
  }
  return '';
};

export const getCompletedDate = (complaint) => {
  if (!complaint) return null;
  return (
    complaint.completedAt ||
    complaint.resolvedAt ||
    complaint.resolutionDetails?.resolvedDate ||
    (Array.isArray(complaint.actions) && (complaint.actions[0]?.completedAt || complaint.actions[0]?.createdAt)) ||
    (complaint.status === 'Completed' || complaint.status === 'Resolved' ? complaint.updatedAt : null)
  );
};

export const getAssignedSecretaryName = (complaint) => {
  if (!complaint) return 'Unassigned';
  if (complaint.assignedWardSecretary?.name) return complaint.assignedWardSecretary.name;
  if (complaint.assignedWardSecretary?.username) return complaint.assignedWardSecretary.username;
  if (complaint.assignedWardSecretaryId?.name) return complaint.assignedWardSecretaryId.name;
  if (complaint.assignedWardSecretaryId?.username) return complaint.assignedWardSecretaryId.username;
  if (complaint.assignedWardSecretaryName) return complaint.assignedWardSecretaryName;
  if (typeof complaint.assignedWardSecretaryId === 'string' && isNaN(Number(complaint.assignedWardSecretaryId))) {
    return complaint.assignedWardSecretaryId;
  }
  return 'Unassigned';
};

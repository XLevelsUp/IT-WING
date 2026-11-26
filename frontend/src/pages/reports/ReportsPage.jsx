import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  Users,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import AdminPageHeader from '../../components/common/AdminPageHeader';
import { useNotification } from '../../context/NotificationContext';

export const ReportsPage = () => {
  const { t } = useTranslation();
  const { error: notifyError, success: notifySuccess } = useNotification();

  const [reportType, setReportType] = useState('grievances');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Unwanted report cards (Ward Governance Performance, Department Resolution Scorecard,
  // District Infrastructure Projects) are removed from the UI as requested in Task 4.
  const reportTypes = [
    {
      id: 'grievances',
      label: t('reports.tabGrievances', 'Coimbatore District Grievances Comprehensive Report'),
      icon: AlertCircle,
    },
    {
      id: 'members',
      label: t('reports.tabMembers', 'TVK Cadre Roster'),
      icon: Users,
    },
  ];

  // Fetch report data with backend pagination (15 records per page) and date filters
  const fetchReport = async (page = 1, fromDate = appliedStartDate, toDate = appliedEndDate) => {
    try {
      setLoading(true);
      const params = {
        reportType,
        page,
        limit: 15,
      };

      if (fromDate) params.startDate = fromDate;
      if (toDate) params.endDate = toDate;

      const res = await api.get('/reports/data', { params });
      if (res.data?.success) {
        setReportData(res.data.data);
        setCurrentPage(page);
      } else {
        notifyError(res.data?.message || 'Failed to fetch report');
      }
    } catch (err) {
      console.error('fetchReport error:', err);
      notifyError('Failed to generate report records from database');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and reload on reportType change
  useEffect(() => {
    setCurrentPage(1);
    fetchReport(1, appliedStartDate, appliedEndDate);
  }, [reportType]);

  // Handle Apply Filter click - automatically resets to page 1 and preserves date range
  const handleApplyFilter = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setCurrentPage(1);
    fetchReport(1, startDate, endDate);
  };

  // Handle Clear Filter click
  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setAppliedStartDate('');
    setAppliedEndDate('');
    setCurrentPage(1);
    fetchReport(1, '', '');
  };

  // Handle Page navigation - preserves selected date range
  const handlePageChange = (newPage) => {
    if (newPage < 1 || (reportData?.totalPages && newPage > reportData.totalPages)) return;
    fetchReport(newPage, appliedStartDate, appliedEndDate);
    // Smooth scroll to table container
    const tableEl = document.getElementById('report-table-section');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Unified download function for Generate Report & Export Excel
  // Fetches ALL matching records from the database and downloads valid Excel .xlsx
  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      const params = { reportType };
      const fromDate = startDate || appliedStartDate;
      const toDate = endDate || appliedEndDate;

      if (fromDate) params.startDate = fromDate;
      if (toDate) params.endDate = toDate;

      const res = await api.get('/reports/export/excel', {
        params,
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header if available
      let filename = '';
      const disposition = res.headers['content-disposition'] || res.headers['Content-Disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      if (!filename) {
        if (fromDate && toDate) {
          filename = `Coimbatore_District_Grievance_Report_${fromDate}_to_${toDate}.xlsx`;
        } else if (fromDate) {
          filename = `Coimbatore_District_Grievance_Report_from_${fromDate}.xlsx`;
        } else if (toDate) {
          filename = `Coimbatore_District_Grievance_Report_up_to_${toDate}.xlsx`;
        } else {
          filename = `Coimbatore_District_Grievance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        }
      }

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notifySuccess(t('reports.downloadSuccess', 'Report generated and downloaded successfully!'));
    } catch (err) {
      console.error('Download report error:', err);
      notifyError('Failed to generate and download Excel report. Please verify connection and try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper for generating pagination page numbers array
  const getPageNumbers = () => {
    const totalPages = reportData?.totalPages || 1;
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const totalRecords = reportData?.total || 0;
  const totalPages = reportData?.totalPages || 1;
  const pageSize = reportData?.limit || 15;
  const startIndex = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <AdminPageHeader
        badge={t('reports.headerBadge', 'Official Reporting & Data Export')}
        badgeIcon={FileText}
        title={t('reports.title', 'Governance Reports & Audits')}
        tamilTitle="நிர்வாக அறிக்கைகள் மற்றும் தணிக்கை"
        subtitle={t('reports.subtitle', 'Generate, filter, print, and export verifiable district records across all departments and wards.')}
        actions={
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2.5 bg-white/95 hover:bg-white text-[#850000] font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 text-[#A00000]" />
              <span>{t('reports.printReport', 'Print Report')}</span>
            </button>
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2.5 bg-black/40 hover:bg-black/60 text-white font-bold rounded-xl text-xs shadow-sm transition space-x-1.5 border border-[#FFD32A]/50 cursor-pointer disabled:opacity-50"
              title="Download complete report as Excel file"
            >
              <Download className={`w-4 h-4 text-[#FFD32A] ${downloading ? 'animate-bounce' : ''}`} />
              <span>{downloading ? t('reports.downloading', 'Exporting...') : t('reports.exportExcel', 'Export Excel')}</span>
            </button>
          </div>
        }
      />

      {/* Report Selection Tabs / Cards - Three unwanted cards completely removed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        {reportTypes.map((tab) => {
          const Icon = tab.icon;
          const isSelected = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-left transition flex items-center space-x-3 cursor-pointer ${
                isSelected
                  ? 'bg-red-700 text-white border-red-700 shadow-md ring-2 ring-red-700/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-white/20 text-amber-300' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold leading-tight block truncate">{tab.label}</span>
                <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  {tab.id === 'grievances' ? 'District-wide Comprehensive Audit' : 'Cadre & Member Directory'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Date Filter & Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date Filter Inputs & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* From Date */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-red-700">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <label htmlFor="fromDateInput" className="font-semibold text-slate-600 whitespace-nowrap">
                {t('reports.fromDate', 'From Date')}:
              </label>
              <input
                id="fromDateInput"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-0 p-0 text-slate-800 text-xs font-medium focus:outline-none focus:ring-0"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-red-700">
              <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <label htmlFor="toDateInput" className="font-semibold text-slate-600 whitespace-nowrap">
                {t('reports.toDate', 'To Date')}:
              </label>
              <input
                id="toDateInput"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-0 p-0 text-slate-800 text-xs font-medium focus:outline-none focus:ring-0"
              />
            </div>

            {/* Apply Filter Button */}
            <button
              onClick={handleApplyFilter}
              className="inline-flex items-center px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl transition shadow-sm cursor-pointer space-x-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{t('reports.applyFilter', 'Apply Filter')}</span>
            </button>

            {/* Clear Filter Button */}
            {(startDate || endDate || appliedStartDate || appliedEndDate) && (
              <button
                onClick={handleClearFilter}
                className="inline-flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition cursor-pointer space-x-1"
                title="Reset date filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('reports.clearFilter', 'Clear')}</span>
              </button>
            )}

            {/* Generate Report Button - Generates & Downloads Complete Report */}
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="inline-flex items-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition shadow-sm cursor-pointer space-x-1.5 disabled:opacity-50"
              title="Generate complete report and download Excel file"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${downloading ? 'animate-spin' : ''}`} />
              <span>{downloading ? t('reports.downloading', 'Generating...') : t('reports.generateReport', 'Generate Report')}</span>
            </button>
          </div>

          {/* Active Filter & Record Count Badge */}
          <div className="flex items-center gap-2 text-xs">
            {appliedStartDate || appliedEndDate ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                Period: {appliedStartDate || 'Beginning'} → {appliedEndDate || 'Present'}
              </span>
            ) : null}
            <span className="text-slate-500 font-medium">
              Total Matching: <strong className="text-slate-800 font-bold">{totalRecords}</strong> records
            </span>
          </div>
        </div>

        {/* Executive KPI Summary Counters for Grievances */}
        {reportType === 'grievances' && reportData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Filed</span>
                <span className="text-sm font-extrabold text-slate-800">{totalRecords}</span>
              </div>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 block tracking-wider">Resolved</span>
                <span className="text-sm font-extrabold text-emerald-700">{reportData.resolved || 0}</span>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-600 block tracking-wider">In Progress</span>
                <span className="text-sm font-extrabold text-blue-700">{reportData.inProgress || 0}</span>
              </div>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 block tracking-wider">Pending</span>
                <span className="text-sm font-extrabold text-amber-700">{reportData.pending || 0}</span>
              </div>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        )}
      </div>

      {/* Report Display Container */}
      <div id="report-table-section" className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">{reportData?.title || 'Report Audit'}</h2>
            <p className="text-xs text-slate-400">
              Tamilaga Vettri Kazhagam • Coimbatore District Governance Portal
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <span>•</span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text={t('reports.loadingText', 'Compiling verifiable report...')} />
        ) : !reportData?.records || reportData.records.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              {t('reports.noData', 'No records found for this period.')}
            </p>
            <p className="text-[11px] text-slate-400">
              Try adjusting the date range or clearing the filter to see more results.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* GRIEVANCES REPORT TABLE (15 Records Per Page Default) */}
            {reportType === 'grievances' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 w-12 text-center">S.No</th>
                      <th className="py-3 px-3">Grievance ID</th>
                      <th className="py-3 px-3">Complainant Name</th>
                      <th className="py-3 px-3">Mobile Number</th>
                      <th className="py-3 px-3">Constituency</th>
                      <th className="py-3 px-3">Paguthi</th>
                      <th className="py-3 px-3">Ward</th>
                      <th className="py-3 px-3">Department</th>
                      <th className="py-3 px-3 min-w-[180px]">Grievance Subject</th>
                      <th className="py-3 px-3">Submitted Date</th>
                      <th className="py-3 px-3">Assigned Officer</th>
                      <th className="py-3 px-3">Current Status</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Resolution Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.records.map((r, i) => {
                      const serialNumber = (currentPage - 1) * pageSize + i + 1;
                      const constituencyName = r.constituencyId?.name || r.constituency?.name || 'Kinathukadavu';
                      const paguthiName = r.paguthi || (r.wardId?.wardName ? r.wardId.wardName.split(' ')[0] : '-');
                      const wardDisplay = r.wardId
                        ? `Ward ${r.wardId.wardNumber || ''}${r.wardId.wardName ? ` - ${r.wardId.wardName}` : ''}`
                        : r.wardNumber
                        ? `Ward ${r.wardNumber}${r.wardName ? ` - ${r.wardName}` : ''}`
                        : '-';
                      const officerDisplay =
                        r.assignedOfficer || r.assignedOfficerId?.officerName || 'Unassigned';
                      const resolutionDate = r.resolvedAt
                        ? new Date(r.resolvedAt).toLocaleDateString()
                        : r.completedAt
                        ? new Date(r.completedAt).toLocaleDateString()
                        : '-';

                      return (
                        <tr key={r.id || r._id || i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">{serialNumber}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-red-700">{r.issueCode || r.complaintId || r.id}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{r.citizenName || '-'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{r.citizenMobile || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{constituencyName}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">{paguthiName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{wardDisplay}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{r.assignedDepartment || '-'}</td>
                          <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate" title={r.description || r.title}>
                            <span className="font-medium">{r.title || '-'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">{officerDisplay}</td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="py-2.5 px-3">
                            <PriorityBadge priority={r.priority} />
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{resolutionDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* MEMBERS REPORT TABLE */}
            {reportType === 'members' && (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 w-12 text-center">S.No</th>
                      <th className="py-3 px-3">Member ID</th>
                      <th className="py-3 px-3">Full Name</th>
                      <th className="py-3 px-3">Gender</th>
                      <th className="py-3 px-3">Mobile Number</th>
                      <th className="py-3 px-3">Ward</th>
                      <th className="py-3 px-3">Designation</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.records.map((m, i) => (
                      <tr key={m.id || m._id || i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono font-medium">
                          {(currentPage - 1) * pageSize + i + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-red-700">{m.memberId}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{m.fullName}</td>
                        <td className="py-2.5 px-3">{m.gender}</td>
                        <td className="py-2.5 px-3 font-mono">{m.mobileNumber}</td>
                        <td className="py-2.5 px-3">
                          {m.wardId ? `Ward ${m.wardId.wardNumber || ''} - ${m.wardId.wardName || ''}` : '-'}
                        </td>
                        <td className="py-2.5 px-3">{m.designation}</td>
                        <td className="py-2.5 px-3">
                          <StatusBadge status={m.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
              <div className="text-slate-500 font-medium">
                {t('reports.showing', 'Showing')}{' '}
                <span className="font-bold text-slate-800">{startIndex}</span> to{' '}
                <span className="font-bold text-slate-800">{endIndex}</span> of{' '}
                <span className="font-bold text-slate-800">{totalRecords}</span> {t('reports.records', 'records')}{' '}
                ({t('reports.page', 'Page')} {currentPage} {t('reports.of', 'of')} {totalPages})
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`inline-flex items-center px-3 py-1.5 rounded-xl font-bold border transition text-xs cursor-pointer ${
                      currentPage === 1
                        ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    <span>{t('reports.previous', 'Previous')}</span>
                  </button>

                  {/* Page Numbers: Page 1 | Page 2 | Page 3 | ... */}
                  {getPageNumbers().map((p, idx) =>
                    p === '...' ? (
                      <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-bold">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        onClick={() => handlePageChange(p)}
                        className={`min-w-[32px] h-8 px-2.5 rounded-xl font-bold transition text-xs cursor-pointer ${
                          currentPage === p
                            ? 'bg-red-700 text-white shadow-sm border border-red-700'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`inline-flex items-center px-3 py-1.5 rounded-xl font-bold border transition text-xs cursor-pointer ${
                      currentPage === totalPages
                        ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t('reports.next', 'Next')}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;

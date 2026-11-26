import { Op } from 'sequelize';
import sequelize from '../config/mysql.js';
import Issue from '../models/Issue.js';
import Member from '../models/Member.js';
import Ward from '../models/Ward.js';
import Constituency from '../models/Constituency.js';
import DepartmentOfficer from '../models/DepartmentOfficer.js';
import Project from '../models/Project.js';

export const generateAIContent = async ({ contentType, topic, language, promptDescription }) => {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;

  const systemInstruction = `You are the official Communications & Public Relations Intelligence Officer for Tamilaga Vettri Kazhagam (TVK) Coimbatore District Administration.
Generate an authoritative, professional, respectful, and articulate ${contentType} about "${topic}".
Language requirement: ${language === 'Tamil' ? 'Formal Tamil (செந்தமிழ் நடை)' : language === 'Bilingual' ? 'Bilingual (Tamil followed by English translation)' : 'Formal English'}.
Additional instructions: ${promptDescription || 'Focus on citizen welfare, prompt grievance resolution, transparent administration, and district progress.'}`;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemInstruction }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1200,
            },
          }),
        }
      );

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (err) {
      console.error('Gemini API call error:', err.message);
    }
  }

  // Intelligent fallback template generator in Tamil & English
  if (language === 'Tamil') {
    return `தமிழக வெற்றிக் கழகம் - கோயம்புத்தூர் மாவட்டம்
அதிகாரப்பூர்வ அறிக்கை: ${topic}

தலைப்பு: ${contentType} - ${topic}
நாள்: ${new Date().toLocaleDateString('ta-IN')}

வணக்கம்,
கோயம்புத்தூர் மாவட்ட மக்களின் மேலான கவனத்திற்கு:

${promptDescription ? promptDescription : 'மக்களின் அடிப்படைத் தேவைகள் மற்றும் பொதுமக்களின் குறைதீர்க்கும் பணிகளில் தமிழக வெற்றிக் கழகம் என்றும் முன்னணியில் செயல்பட்டு வருகிறது.'}

முக்கிய அம்சங்கள்:
1. கோயம்புத்தூர் தெற்கு, வடக்கு, சிங்காநல்லூர் உள்ளிட்ட அனைத்து சட்டமன்ற தொகுதிகளிலும் வார்டு வாரியாக மக்களின் குறைகளை கண்டறிந்து உடனுக்குடன் தீர்வு காணப்பட்டு வருகிறது.
2. குடிநீர் விநியோகம், தெருவிளக்கு பராமரிப்பு, சாலை மற்றும் வடிகால் சீரமைப்புப் பணிகளுக்கு உடனடி முன்னுரிமை அளிக்கப்படுகிறது.
3. பொதுமக்கள் தங்களது பகுதி சார்ந்த குறைபாடுகளை TVK Digital Governance CRM வாயிலாக பதிவு செய்து தீர்வு பெறலாம்.

மக்களின் உரிமைகளையும் நல்வாழ்வையும் பாதுகாப்பதே நமது தலையாய கடமை!

இவண்,
மாவட்ட ஒருங்கிணைப்புக் குழு,
தமிழக வெற்றிக் கழகம் (TVK), கோயம்புத்தூர்.`;
  }

  return `TAMILAGA VETTRI KAZHAGAM (TVK) - COIMBATORE DISTRICT
OFFICIAL COMMUNIQUÉ: ${topic}

Subject: ${contentType} - ${topic}
Date: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}

To the Esteemed Citizens of Coimbatore District,

${promptDescription ? promptDescription : 'Tamilaga Vettri Kazhagam remains steadfastly committed to transparent governance, rapid grievance redressal, and dedicated public service across all municipal wards in Coimbatore.'}

Key Directives & Action Points:
1. Systemic monitoring of ward-level infrastructure, including clean drinking water supply, road repairs, street lighting, and environmental sanitation.
2. Active coordination between TVK office bearers, ward representatives, and district department officers to accelerate pending public works.
3. Digital grievance tracking through the TVK Digital Governance CRM ensures every citizen petition receives accountability and timely closure.

Together for the sustainable progress and welfare of Coimbatore District!

Sincerely,
District Governance & Public Relations Directorate,
Tamilaga Vettri Kazhagam (TVK), Coimbatore.`;
};

// Grounded Chatbot Knowledge Engine that queries live MySQL data via Sequelize
export const processChatbotQuery = async (queryText) => {
  const q = String(queryText || '').toLowerCase().trim();

  // QUESTION 1: Which ward has the highest number of issues?
  if (
    q.includes('highest number of issues') ||
    (q.includes('ward') && (q.includes('highest') || q.includes('most issues') || q.includes('high issues')))
  ) {
    try {
      const issues = await Issue.findAll({
        attributes: ['id', 'wardId', 'wardNumber', 'wardName'],
        raw: true,
      });

      if (!issues || issues.length === 0) {
        return {
          text: 'No matching records found. There are currently no grievances recorded in the database.',
          suggestedActions: [
            'What is the total number of members?',
            'How many grievances are pending?',
            'Show the executive summary',
          ],
        };
      }

      // Fetch all wards for accurate wardName mapping
      const wards = await Ward.findAll({
        attributes: ['id', 'wardNumber', 'wardName'],
        raw: true,
      });
      const wardMapById = new Map();
      const wardMapByNum = new Map();
      wards.forEach((w) => {
        if (w.id) wardMapById.set(w.id, w);
        if (w.wardNumber) wardMapByNum.set(w.wardNumber, w);
      });

      // Count complaints per ward
      const countsByWard = {};
      issues.forEach((iss) => {
        const wDoc = (iss.wardId && wardMapById.get(iss.wardId)) || (iss.wardNumber && wardMapByNum.get(iss.wardNumber));
        const num = wDoc?.wardNumber || iss.wardNumber || (iss.wardId ? `ID-${iss.wardId}` : 'General');
        const name = wDoc?.wardName || iss.wardName || '';
        const key = String(num);
        if (!countsByWard[key]) {
          countsByWard[key] = {
            wardNumber: num,
            wardName: name,
            count: 0,
          };
        }
        countsByWard[key].count += 1;
        if (!countsByWard[key].wardName && name) {
          countsByWard[key].wardName = name;
        }
      });

      const sortedWards = Object.values(countsByWard).sort((a, b) => b.count - a.count);

      const maxCount = sortedWards[0]?.count || 0;
      if (maxCount === 0) {
        return {
          text: 'No matching records found. All recorded wards currently have 0 complaints.',
          suggestedActions: ['Show the executive summary'],
        };
      }

      // Handle ties: Find all wards with the highest count
      const topWards = sortedWards.filter((w) => w.count === maxCount);
      const topWardNames = topWards
        .map((w) => {
          const nameStr = w.wardName ? ` (${w.wardName})` : '';
          return `Ward ${w.wardNumber}${nameStr}`;
        })
        .join(', ');

      const headerLine =
        topWards.length > 1
          ? `Highest Issues Wards (Tied): ${topWardNames}`
          : `Highest Issues Ward: ${topWardNames}`;

      // List other wards in descending order (up to 8)
      const otherWardsList = sortedWards.slice(0, 8).map((w) => {
        const nameStr = w.wardName ? ` (${w.wardName})` : '';
        return `- Ward ${w.wardNumber}${nameStr} – ${w.count} complaints`;
      });

      const responseText = `${headerLine}\n\nTotal Issues: ${maxCount}\n\nOther Ward Analysis:\n${otherWardsList.join('\n')}`;

      return {
        text: responseText,
        suggestedActions: [
          'How many grievances are pending?',
          'What is the category-wise issue analysis?',
          'Show the executive summary',
        ],
      };
    } catch (err) {
      console.error('Error calculating highest issue ward:', err);
      return {
        text: 'An error occurred while analyzing ward issue data from the database. Please try again.',
        suggestedActions: ['Show the executive summary'],
      };
    }
  }

  // QUESTION 2: What is the total number of members?
  if (
    q.includes('total number of members') ||
    (q.includes('member') && (q.includes('total') || q.includes('how many') || q.includes('count') || q.includes('active')))
  ) {
    try {
      const totalMembers = await Member.count();
      let activeMembers = totalMembers;
      let inactiveMembers = 0;

      // Count only members whose existing database status indicates Active
      if (Member.rawAttributes && Member.rawAttributes.status) {
        try {
          activeMembers = await Member.count({
            where: {
              [Op.or]: [
                { status: { [Op.notIn]: ['Inactive', 'inactive', 'Deleted', 'deleted'] } },
                { status: null },
              ],
            },
          });
          inactiveMembers = Math.max(0, totalMembers - activeMembers);
        } catch (e) {
          activeMembers = totalMembers;
          inactiveMembers = 0;
        }
      }

      if (totalMembers === 0) {
        return {
          text: 'No matching records found. There are currently no registered TVK members in the database.',
          suggestedActions: ['Show the executive summary'],
        };
      }

      const responseText = `Total Registered Members: ${totalMembers}\n\nActive Members: ${activeMembers}\n\nInactive Members: ${inactiveMembers}`;

      return {
        text: responseText,
        suggestedActions: [
          'Which ward has the highest number of issues?',
          'How many grievances are pending?',
          'Show the executive summary',
        ],
      };
    } catch (err) {
      console.error('Error calculating member counts:', err);
      return {
        text: 'An error occurred while retrieving TVK member records from the database.',
        suggestedActions: ['Show the executive summary'],
      };
    }
  }

  // QUESTION 3: How many grievances are pending?
  if (
    q.includes('grievances are pending') ||
    q.includes('pending grievances') ||
    q.includes('pending issues') ||
    (q.includes('how many') && q.includes('pending'))
  ) {
    try {
      const newCount = await Issue.count({ where: { status: 'New' } });
      const pendingCount = await Issue.count({
        where: { status: { [Op.in]: ['Pending', 'Assigned', 'Under Review'] } },
      });
      const inProgressCount = await Issue.count({ where: { status: 'In Progress' } });
      const completedCount = await Issue.count({
        where: { status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] } },
      });

      // Total pending grievances (all non-completed grievances awaiting resolution)
      const totalPendingGrievances = pendingCount + newCount + inProgressCount;

      const responseText = `Total Pending Grievances: ${totalPendingGrievances}\n\nStatus Breakdown:\n- Pending: ${pendingCount + newCount}\n- In Progress: ${inProgressCount}\n- Completed: ${completedCount}`;

      return {
        text: responseText,
        suggestedActions: [
          'Which department has the most pending issues?',
          'What is the category-wise issue analysis?',
          'Show the executive summary',
        ],
      };
    } catch (err) {
      console.error('Error calculating pending grievances:', err);
      return {
        text: 'An error occurred while calculating pending grievances from the database.',
        suggestedActions: ['Show the executive summary'],
      };
    }
  }

  // QUESTION 4: What is the category-wise issue analysis?
  if (
    q.includes('category-wise') ||
    q.includes('category wise') ||
    (q.includes('category') && q.includes('analysis'))
  ) {
    try {
      const allIssues = await Issue.findAll({
        attributes: ['id', 'category', 'status'],
        raw: true,
      });

      if (!allIssues || allIssues.length === 0) {
        return {
          text: 'No matching records found. No category records are currently available in the database.',
          suggestedActions: ['Show the executive summary'],
        };
      }

      const catMap = {};
      allIssues.forEach((issue) => {
        const cat = issue.category || 'General Grievance';
        if (!catMap[cat]) {
          catMap[cat] = { total: 0, pending: 0, completed: 0 };
        }
        catMap[cat].total += 1;
        const isCompleted = ['Completed', 'Resolved', 'Closed'].includes(issue.status);
        if (isCompleted) {
          catMap[cat].completed += 1;
        } else {
          catMap[cat].pending += 1;
        }
      });

      const sortedCategories = Object.entries(catMap)
        .map(([name, counts]) => ({ name, ...counts }))
        .sort((a, b) => b.total - a.total);

      const categoryLines = sortedCategories.map((c) => {
        return `- ${c.name} – ${c.total} complaints (Pending: ${c.pending}, Completed: ${c.completed})`;
      });

      const responseText = `Category-wise Issue Analysis:\n\n${categoryLines.join('\n')}`;

      return {
        text: responseText,
        suggestedActions: [
          'Which ward has the highest number of issues?',
          'Which department has the most pending issues?',
          'Show the executive summary',
        ],
      };
    } catch (err) {
      console.error('Error analyzing category data:', err);
      return {
        text: 'An error occurred while calculating category-wise issue analysis from the database.',
        suggestedActions: ['Show the executive summary'],
      };
    }
  }

  // QUESTION 5: Show the executive summary
  if (
    q.includes('executive summary') ||
    q.includes('summary') ||
    q.includes('overview')
  ) {
    try {
      const allIssues = await Issue.findAll({
        attributes: ['id', 'status', 'category', 'assignedDepartment', 'wardId', 'wardNumber', 'wardName'],
        raw: true,
      });
      const totalIssues = allIssues.length;
      let newIssues = 0;
      let pendingIssues = 0;
      let inProgressIssues = 0;
      let completedIssues = 0;

      const catCounts = {};
      const deptCounts = {};
      const wardCounts = {};

      allIssues.forEach((iss) => {
        if (iss.status === 'New') newIssues += 1;
        if (['Pending', 'Assigned', 'Under Review'].includes(iss.status)) pendingIssues += 1;
        if (iss.status === 'In Progress') inProgressIssues += 1;
        if (['Completed', 'Resolved', 'Closed'].includes(iss.status)) completedIssues += 1;

        // Category count
        const cat = iss.category || 'General';
        catCounts[cat] = (catCounts[cat] || 0) + 1;

        // Ward count
        const wKey = iss.wardNumber || (iss.wardId ? `Ward ${iss.wardId}` : 'General');
        wardCounts[wKey] = (wardCounts[wKey] || 0) + 1;

        // Pending department count
        if (!['Completed', 'Resolved', 'Closed'].includes(iss.status)) {
          const dept = (iss.assignedDepartment || '').trim();
          if (dept) {
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
          }
        }
      });

      const totalMembers = await Member.count();
      let activeMembers = totalMembers;
      if (Member.rawAttributes && Member.rawAttributes.status) {
        try {
          activeMembers = await Member.count({
            where: {
              [Op.or]: [
                { status: { [Op.notIn]: ['Inactive', 'inactive', 'Deleted', 'deleted'] } },
                { status: null },
              ],
            },
          });
        } catch (e) {
          activeMembers = totalMembers;
        }
      }

      const totalWards = await Ward.count({ distinct: true, col: 'wardNumber' });

      // Highest Issue Ward
      let topWardText = 'None';
      const sortedWards = Object.entries(wardCounts).sort((a, b) => b[1] - a[1]);
      if (sortedWards.length > 0) {
        const topW = sortedWards[0];
        topWardText = `Ward ${topW[0]} (${topW[1]} complaints)`;
      }

      // Most reported category
      let topCategoryText = 'None';
      const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
      if (sortedCats.length > 0) {
        topCategoryText = `${sortedCats[0][0]} (${sortedCats[0][1]} complaints)`;
      }

      // Department with most pending
      let topDeptText = 'None';
      const sortedDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
      if (sortedDepts.length > 0) {
        topDeptText = `${sortedDepts[0][0]} (${sortedDepts[0][1]} pending)`;
      }

      const resolutionRate =
        totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

      const responseText = `EXECUTIVE SUMMARY

Overall Complaint Statistics:
- Total Grievances: ${totalIssues}
- New Complaints: ${newIssues}
- Pending: ${pendingIssues}
- In Progress: ${inProgressIssues}
- Completed: ${completedIssues}

Member Statistics:
- Total Members: ${totalMembers}
- Active Members: ${activeMembers}

Ward Statistics:
- Total Wards: ${totalWards}
- Highest Issue Ward: ${topWardText}

Complaint Analysis:
- Highest Complaint Category: ${topCategoryText}
- Department with Most Pending Issues: ${topDeptText}

Summary:
The TVK Digital Governance CRM for Coimbatore District currently records ${totalIssues} total citizen grievances across ${totalWards} municipal wards. Active administrative resolution stands at ${completedIssues} completed complaints (${resolutionRate}% resolution efficiency), with ${newIssues} new complaints awaiting initial inspection and ${pendingIssues} pending resolution. The TVK cadre comprises ${activeMembers} active members actively engaged in community governance and grievance redressing.`;

      return {
        text: responseText,
        suggestedActions: [
          'Which ward has the highest number of issues?',
          'What is the total number of members?',
          'How many grievances are pending?',
        ],
      };
    } catch (err) {
      console.error('Error generating executive summary:', err);
      return {
        text: 'An error occurred while generating the executive summary from the database.',
        suggestedActions: ['How many grievances are pending?'],
      };
    }
  }

  // QUESTION 6: Which department has the most pending issues?
  if (
    q.includes('department') &&
    (q.includes('most pending') || q.includes('pending issues') || q.includes('pending') || q.includes('most'))
  ) {
    try {
      const pendingIssues = await Issue.findAll({
        attributes: ['id', 'assignedDepartment', 'status'],
        where: {
          status: { [Op.notIn]: ['Completed', 'Resolved', 'Closed'] },
        },
        raw: true,
      });

      const deptCounts = {};
      pendingIssues.forEach((iss) => {
        const dept = (iss.assignedDepartment || '').trim();
        if (dept) {
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        }
      });

      const deptEntries = Object.entries(deptCounts);
      if (deptEntries.length === 0) {
        if (pendingIssues.length === 0) {
          return {
            text: 'No pending issues found across any department. All assigned departmental grievances are currently completed.',
            suggestedActions: ['Show the executive summary'],
          };
        }
        return {
          text: 'The available grievance records do not contain sufficient department mapping.',
          suggestedActions: [
            'Which ward has the highest number of issues?',
            'What is the category-wise issue analysis?',
            'Show the executive summary',
          ],
        };
      }

      deptEntries.sort((a, b) => b[1] - a[1]);
      const maxPending = deptEntries[0][1];

      // Handle ties: Find all departments with highest pending count
      const topDepts = deptEntries.filter((d) => d[1] === maxPending);
      const topDeptNames = topDepts.map((d) => d[0]).join(' & ');

      // Other departments in descending order
      const otherDepts = deptEntries.slice(topDepts.length, topDepts.length + 5);
      const otherDeptsSection =
        otherDepts.length > 0
          ? `\n\nOther Departments:\n${otherDepts.map((d) => `- ${d[0]} – ${d[1]}`).join('\n')}`
          : '';

      const responseText = `Department with Most Pending Issues:\n\nDepartment: ${topDeptNames}\n\nPending Issues: ${maxPending}${otherDeptsSection}`;

      return {
        text: responseText,
        suggestedActions: [
          'How many grievances are pending?',
          'What is the category-wise issue analysis?',
          'Show the executive summary',
        ],
      };
    } catch (err) {
      console.error('Error calculating department pending issues:', err);
      return {
        text: 'An error occurred while querying department pending issues from the database.',
        suggestedActions: ['Show the executive summary'],
      };
    }
  }

  // Fallback for general greetings or non-predefined questions:
  try {
    const totalIssues = await Issue.count();
    const completedIssues = await Issue.count({
      where: { status: { [Op.in]: ['Completed', 'Resolved', 'Closed'] } },
    });
    const pendingIssues = await Issue.count({
      where: { status: { [Op.notIn]: ['Completed', 'Resolved', 'Closed'] } },
    });
    const totalMembers = await Member.count();
    const totalWards = await Ward.count({ distinct: true, col: 'wardNumber' });

    return {
      text: `Vanakkam! I am the **TVK AI Assistant** for Coimbatore District.\n\nCurrent Live Metrics:\n- Total Grievances: **${totalIssues}** (${completedIssues} completed, ${pendingIssues} pending)\n- TVK Cadre: **${totalMembers} members** across **${totalWards} municipal wards**\n\nPlease select one of the 6 official inquiries below for live database analysis.`,
      suggestedActions: [
        'Which ward has the highest number of issues?',
        'What is the total number of members?',
        'How many grievances are pending?',
        'What is the category-wise issue analysis?',
        'Show the executive summary',
        'Which department has the most pending issues?',
      ],
    };
  } catch (err) {
    return {
      text: 'Vanakkam! I am the **TVK AI Assistant** for Coimbatore District. Please select one of the 6 official inquiries below for live database analysis.',
      suggestedActions: [
        'Which ward has the highest number of issues?',
        'What is the total number of members?',
        'How many grievances are pending?',
        'What is the category-wise issue analysis?',
        'Show the executive summary',
        'Which department has the most pending issues?',
      ],
    };
  }
};

export const themeCatalog = [
  'Doctor Care', 'Clinical Treatment', 'Clinical Team', 'Treatment Effectiveness', 'Pain Management', 'Medical Explanation',
  'Nursing Care', 'Nursing Courtesy', 'Compassion', 'Responsiveness', 'Call Bell', 'Patient Comfort',
  'Appointment', 'Telephone Service', 'Registration', 'Admission', 'Reception', 'Waiting Time',
  'Cleanliness', 'Hygiene', 'Room', 'Washroom', 'Noise', 'Facilities', 'Comfort',
  'Billing', 'Insurance', 'Approvals', 'Financial Communication',
  'Pharmacy Service', 'Medicine Availability', 'Medicine Collection', 'Pharmacy Staff',
  'Laboratory', 'Radiology', 'Cardiology', 'Physiotherapy',
  'Food Quality', 'Food Service', 'Housekeeping', 'Hospitality',
  'Discharge Process', 'Discharge Delay', 'Discharge Communication',
  'Parking', 'Valet', 'Security',
  'Doctor Communication', 'Staff Communication', 'Treatment Explanation', 'Progress Updates', 'Query Handling',
  'General Satisfaction', 'Overall Experience', 'Recommendation', 'Appreciation', 'General Complaint'
];

export function classifyThemes(comment) {
  const cleaned = String(comment || '').trim().toLowerCase();
  if (!cleaned) return [];

  const themes = [];
  const checks = [
    ['Doctor Care', ['doctor', 'consultation', 'physician', 'treatment'] ],
    ['Clinical Treatment', ['treatment', 'medicine', 'care'] ],
    ['Registration', ['registration', 'front desk', 'counter'] ],
    ['Waiting Time', ['waiting', 'delay', 'slow', 'timing'] ],
    ['Nursing Care', ['nurse', 'nursing'] ],
    ['Cleanliness', ['clean', 'hygiene', 'dirty'] ],
    ['Billing', ['billing', 'bill', 'finance', 'insurance'] ],
    ['Pharmacy Service', ['pharmacy', 'medicine', 'drug'] ],
    ['Discharge Process', ['discharge'] ],
    ['Parking', ['parking', 'valet'] ],
    ['Doctor Communication', ['communication', 'explained', 'doctor explained', 'doctor communication'] ],
    ['General Satisfaction', ['thank', 'excellent', 'good', 'great', 'appreciate', 'satisfied'] ],
    ['General Complaint', ['complaint', 'poor', 'dissatisfied', 'issue'] ]
  ];

  for (const [theme, keywords] of checks) {
    const matches = keywords.some((keyword) => cleaned.includes(keyword));
    if (matches) themes.push(theme);
  }

  return Array.from(new Set(themes));
}

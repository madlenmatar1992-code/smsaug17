import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

type DashboardApi = {
  hospitalOptions: string[];
  dataQuality: Record<string, number>;
  npsSummary: Record<string, number>;
  hospitalSummary: { hospital: string; feedbackCount: number; nps: number; promoterPct: number; detractorPct: number; positivePct: number; negativePct: number }[];
  issueSummary: { totalIssueRows: number; byTheme: { theme: string; count: number }[]; bySentiment: Record<string, number> };
  records: any[];
  metadata: { lastRefresh: string; sourceFiles: string[]; recordCount: number; issueRowCount: number };
};

const COLORS = {
  positive: '#2f9e44',
  negative: '#d9480f',
  neutral: '#f08c00',
  gray: '#adb5bd',
  primary: '#164e63',
  accent: '#0ea5e9',
  nps: '#0f766e'
};

const hospitalOptions = [
  'All Hospitals',
  'Medcare Royal Speciality Hospital',
  'Medcare Hospital Sharjah Branch 1',
  'Medcare Hospital, Sharjah'
];

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardApi | null>(null);
  const [filters, setFilters] = useState({
    hospital: 'All Hospitals',
    patientType: 'All',
    surveySource: 'All',
    dateFrom: '',
    dateTo: '',
    speciality: 'All',
    doctor: 'All',
    location: 'All',
    npsSegment: 'All',
    sentiment: 'All',
    feedbackType: 'All'
  });

  useEffect(() => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => setDashboard(data))
      .catch((error) => console.error(error));
  }, []);

  const filteredRecords = useMemo(() => {
    if (!dashboard) return [] as any[];
    const list = [...dashboard.records];
    return list.filter((record) => {
      const hospitalMatch = filters.hospital === 'All Hospitals' || record.Hospital === filters.hospital;
      const patientTypeMatch = filters.patientType === 'All' || record.PatientType === filters.patientType;
      const surveySourceMatch = filters.surveySource === 'All' || record.Source === filters.surveySource;
      const specialityMatch = filters.speciality === 'All' || record.Speciality === filters.speciality;
      const doctorMatch = filters.doctor === 'All' || record.TreatingDoctor === filters.doctor;
      const locationMatch = filters.location === 'All' || record.Location === filters.location;
      const npsMatch = filters.npsSegment === 'All' || record.NPSSegment === filters.npsSegment;
      const sentimentMatch = filters.sentiment === 'All' || record.Sentiment === filters.sentiment;
      const dateMatch = (!filters.dateFrom || record.SurveyDate >= filters.dateFrom) && (!filters.dateTo || record.SurveyDate <= filters.dateTo);
      return hospitalMatch && patientTypeMatch && surveySourceMatch && specialityMatch && doctorMatch && locationMatch && npsMatch && sentimentMatch && dateMatch;
    });
  }, [dashboard, filters]);

  const npsData = useMemo(() => {
    const valid = filteredRecords.filter((record) => Number.isFinite(record.NPSScore));
    const promoters = valid.filter((record) => record.NPSScore >= 9 && record.NPSScore <= 10).length;
    const detractors = valid.filter((record) => record.NPSScore >= 0 && record.NPSScore <= 6).length;
    const neutrals = valid.filter((record) => record.NPSScore >= 7 && record.NPSScore <= 8).length;
    const total = valid.length || 1;
    return {
      total,
      promoters,
      neutrals,
      detractors,
      nps: ((promoters - detractors) / total) * 100,
      promoterPct: (promoters / total) * 100,
      neutralPct: (neutrals / total) * 100,
      detractorPct: (detractors / total) * 100
    };
  }, [filteredRecords]);

  const sentimentSummary = useMemo(() => {
    const total = filteredRecords.length || 1;
    const counts: Record<'Positive' | 'Negative' | 'Neutral' | 'No Relevant Sentiment', number> = {
      Positive: 0,
      Negative: 0,
      Neutral: 0,
      'No Relevant Sentiment': 0
    };

    filteredRecords.forEach((record) => {
      const key = (record.Sentiment || 'No Relevant Sentiment') as keyof typeof counts;
      counts[key] = (counts[key] || 0) + 1;
    });

    return {
      counts,
      pct: {
        Positive: (counts.Positive / total) * 100,
        Negative: (counts.Negative / total) * 100,
        Neutral: (counts.Neutral / total) * 100,
        'No Relevant Sentiment': (counts['No Relevant Sentiment'] / total) * 100
      }
    };
  }, [filteredRecords]);

  const topPositiveThemes = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach((record) => {
      (record.Themes || []).forEach((theme: string) => {
        counts[theme] = (counts[theme] || 0) + (record.Sentiment === 'Positive' ? 1 : 0);
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));
  }, [filteredRecords]);

  const topNegativeDrivers = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach((record) => {
      if (record.Sentiment === 'Negative') {
        (record.Themes || []).forEach((theme: string) => {
          counts[theme] = (counts[theme] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([driver, count]) => ({ driver, count }));
  }, [filteredRecords]);

  const trendData = useMemo(() => {
    const map = new Map<string, { date: string; promoters: number; detractors: number; neutrals: number; total: number }>();

    filteredRecords.forEach((record) => {
      const dateKey = record.SurveyDate || 'Unknown';
      const current = map.get(dateKey) || { date: dateKey, promoters: 0, detractors: 0, neutrals: 0, total: 0 };
      if (record.NPSScore !== null && record.NPSScore !== undefined && !Number.isNaN(record.NPSScore)) {
        current.total += 1;
        if (record.NPSScore >= 9 && record.NPSScore <= 10) current.promoters += 1;
        else if (record.NPSScore >= 7 && record.NPSScore <= 8) current.neutrals += 1;
        else if (record.NPSScore >= 0 && record.NPSScore <= 6) current.detractors += 1;
      }
      map.set(dateKey, current);
    });

    return Array.from(map.values()).slice(0, 10).map((item) => {
      const total = item.total || 1;
      return {
        date: item.date,
        NPS: (((item.promoters - item.detractors) / total) * 100),
        PromoterPct: (item.promoters / total) * 100,
        NeutralPct: (item.neutrals / total) * 100,
        DetractorPct: (item.detractors / total) * 100
      };
    });
  }, [filteredRecords]);

  const hospitalComparison = useMemo(() => {
    return hospitalOptions.filter((h) => h !== 'All Hospitals').map((hospital) => {
      const recordsForHospital = filteredRecords.filter((record) => record.Hospital === hospital);
      const total = recordsForHospital.length || 1;
      const valid = recordsForHospital.filter((record) => Number.isFinite(record.NPSScore));
      const promoters = valid.filter((record) => record.NPSScore >= 9 && record.NPSScore <= 10).length;
      const detractors = valid.filter((record) => record.NPSScore >= 0 && record.NPSScore <= 6).length;
      const positive = recordsForHospital.filter((record) => record.Sentiment === 'Positive').length;
      const negative = recordsForHospital.filter((record) => record.Sentiment === 'Negative').length;
      return {
        hospital,
        feedback: recordsForHospital.length,
        nps: valid.length ? ((promoters - detractors) / valid.length) * 100 : 0,
        promoterPct: valid.length ? (promoters / valid.length) * 100 : 0,
        detractorPct: valid.length ? (detractors / valid.length) * 100 : 0,
        positivePct: total ? (positive / total) * 100 : 0,
        negativePct: total ? (negative / total) * 100 : 0
      };
    });
  }, [filteredRecords]);

  const opIpComparison = useMemo(() => {
    const groups = ['OP', 'IP'];
    return groups.map((type) => {
      const recordsForType = filteredRecords.filter((record) => record.SurveyType === type);
      const valid = recordsForType.filter((record) => Number.isFinite(record.NPSScore));
      const promoters = valid.filter((record) => record.NPSScore >= 9 && record.NPSScore <= 10).length;
      const detractors = valid.filter((record) => record.NPSScore >= 0 && record.NPSScore <= 6).length;
      const total = valid.length || 1;
      return {
        type,
        feedback: recordsForType.length,
        nps: valid.length ? ((promoters - detractors) / total) * 100 : 0,
        promoterPct: valid.length ? (promoters / total) * 100 : 0,
        detractorPct: valid.length ? (detractors / total) * 100 : 0,
        positivePct: recordsForType.length ? (recordsForType.filter((record) => record.Sentiment === 'Positive').length / recordsForType.length) * 100 : 0,
        negativePct: recordsForType.length ? (recordsForType.filter((record) => record.Sentiment === 'Negative').length / recordsForType.length) * 100 : 0
      };
    });
  }, [filteredRecords]);

  const positiveComments = useMemo(() => {
    return filteredRecords.filter((record) => record.Sentiment === 'Positive').slice(0, 3);
  }, [filteredRecords]);

  const negativeComments = useMemo(() => {
    return filteredRecords.filter((record) => record.Sentiment === 'Negative').slice(0, 3);
  }, [filteredRecords]);

  const neutralComments = useMemo(() => {
    return filteredRecords.filter((record) => record.Sentiment === 'Neutral').slice(0, 3);
  }, [filteredRecords]);

  const summaryCards = [
    { label: 'Overall NPS', value: `${Math.round(npsData.nps)} `, detail: `${npsData.promoters} promoters / ${npsData.detractors} detractors` },
    { label: 'Total Feedback', value: String(filteredRecords.length), detail: 'Records in scope' },
    { label: 'Positive Sentiment', value: `${sentimentSummary.counts.Positive}`, detail: `${sentimentSummary.pct.Positive.toFixed(1)}%` },
    { label: 'Negative Sentiment', value: `${sentimentSummary.counts.Negative}`, detail: `${sentimentSummary.pct.Negative.toFixed(1)}%` },
    { label: 'Neutral Sentiment', value: `${sentimentSummary.counts.Neutral}`, detail: `${sentimentSummary.pct.Neutral.toFixed(1)}%` },
    { label: 'Feedback Coverage', value: `${((filteredRecords.filter((r) => String(r.PatientComment || '').trim()).length / Math.max(filteredRecords.length, 1)) * 100).toFixed(1)}%`, detail: 'Comments / Total records' }
  ];

  const lastRefresh = dashboard?.metadata?.lastRefresh ? new Date(dashboard.metadata.lastRefresh).toLocaleString() : 'N/A';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-logo">M</div>
          <div>
            <strong>Medcare</strong>
            <span>Patient Experience</span>
          </div>
        </div>

        <nav className="nav-list">
          <button className="nav-item active">Executive Dashboard</button>
          <button className="nav-item">Classified Feedback</button>
          <button className="nav-item">NPS Segment Summary</button>
          <button className="nav-item">Service Excellence Analysis</button>
          <button className="nav-item">Patient Voice</button>
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <h1>Medcare Patient Experience & Healthcare Service Excellence</h1>
            <p>Sharjah Cluster | OP & IP Patient Feedback</p>
          </div>
          <div className="last-refresh">Last Data Refresh: {lastRefresh}</div>
        </header>

        <section className="filter-panel">
          <div className="filter-row">
            <label>
              Hospital
              <select value={filters.hospital} onChange={(e) => setFilters({ ...filters, hospital: e.target.value })}>
                {hospitalOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              Patient Type
              <select value={filters.patientType} onChange={(e) => setFilters({ ...filters, patientType: e.target.value })}>
                <option>All</option>
                <option>OPD</option>
                <option>IPD</option>
              </select>
            </label>
            <label>
              Survey Source
              <select value={filters.surveySource} onChange={(e) => setFilters({ ...filters, surveySource: e.target.value })}>
                <option>All</option>
                <option>SMS</option>
              </select>
            </label>
            <label>
              Date From
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
            </label>
            <label>
              Date To
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
            </label>
            <label>
              Speciality
              <select value={filters.speciality} onChange={(e) => setFilters({ ...filters, speciality: e.target.value })}>
                <option>All</option>
                {[...new Set(filteredRecords.map((r) => r.Speciality).filter(Boolean))].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Treating Doctor
              <select value={filters.doctor} onChange={(e) => setFilters({ ...filters, doctor: e.target.value })}>
                <option>All</option>
                {[...new Set(filteredRecords.map((r) => r.TreatingDoctor).filter(Boolean))].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              Location
              <select value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
                <option>All</option>
                {[...new Set(filteredRecords.map((r) => r.Location).filter(Boolean))].map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              NPS Segment
              <select value={filters.npsSegment} onChange={(e) => setFilters({ ...filters, npsSegment: e.target.value })}>
                <option>All</option>
                <option>Promoter</option>
                <option>Neutral</option>
                <option>Detractor</option>
              </select>
            </label>
            <label>
              Sentiment
              <select value={filters.sentiment} onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}>
                <option>All</option>
                <option>Positive</option>
                <option>Negative</option>
                <option>Neutral</option>
                <option>No Relevant Sentiment</option>
              </select>
            </label>
            <button className="reset-button" onClick={() => setFilters({
              hospital: 'All Hospitals', patientType: 'All', surveySource: 'All', dateFrom: '', dateTo: '', speciality: 'All', doctor: 'All', location: 'All', npsSegment: 'All', sentiment: 'All', feedbackType: 'All'
            })}>Reset Filters</button>
          </div>
        </section>

        <section className="kpis">
          {summaryCards.map((card) => (
            <article key={card.label} className="kpi-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </article>
          ))}
        </section>

        <section className="panel-grid two-up">
          <article className="panel">
            <div className="panel-header">
              <h3>NPS Composition</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[{ name: 'Promoters', value: npsData.promoters }, { name: 'Neutral', value: npsData.neutrals }, { name: 'Detractors', value: npsData.detractors }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={COLORS.nps} />
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Sentiment Mix</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie dataKey="value" data={[{ name: 'Positive', value: sentimentSummary.counts.Positive }, { name: 'Negative', value: sentimentSummary.counts.Negative }, { name: 'Neutral', value: sentimentSummary.counts.Neutral }]} innerRadius={45} outerRadius={80}>
                  <Cell fill={COLORS.positive} />
                  <Cell fill={COLORS.negative} />
                  <Cell fill={COLORS.neutral} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </article>
        </section>

        <section className="panel-grid two-up">
          <article className="panel">
            <div className="panel-header">
              <h3>NPS Trend</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="NPS" stroke={COLORS.nps} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Hospital Comparison</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hospitalComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hospital" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="nps" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </article>
        </section>

        <section className="panel-grid two-up">
          <article className="panel">
            <div className="panel-header">
              <h3>Top Positive Themes</h3>
            </div>
            <ul className="simple-list">
              {topPositiveThemes.map((item) => (
                <li key={item.theme}><span>{item.theme}</span><strong>{item.count}</strong></li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Top Negative Drivers</h3>
            </div>
            <ul className="simple-list negative">
              {topNegativeDrivers.map((item) => (
                <li key={item.driver}><span>{item.driver}</span><strong>{item.count}</strong></li>
              ))}
            </ul>
          </article>
        </section>

        <section className="panel-grid two-up">
          <article className="panel">
            <div className="panel-header">
              <h3>Positive comments</h3>
            </div>
            <ul className="comment-list">
              {positiveComments.map((record: any) => (
                <li key={record.Feedback_ID}>{record.PatientComment || 'No comment'} - <small>{record.Hospital}</small></li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Negative comments</h3>
            </div>
            <ul className="comment-list negative">
              {negativeComments.map((record: any) => (
                <li key={record.Feedback_ID}>{record.PatientComment || 'No comment'} - <small>{record.Hospital}</small></li>
              ))}
            </ul>
          </article>
        </section>

        <section className="panel-grid two-up">
          <article className="panel">
            <div className="panel-header">
              <h3>OP vs IP Comparison</h3>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={opIpComparison}>
                <defs>
                  <linearGradient id="npsFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="nps" stroke={COLORS.primary} fill="url(#npsFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Executive Insights</h3>
            </div>
            <ul className="insights-list">
              <li>Overall patient advocacy remains positive, supported by a strong proportion of Promoters.</li>
              <li>Operational experience remains the major opportunity area across the Sharjah cluster.</li>
              <li>Clinical care and staff compassion continue to represent strong positive patient experience themes.</li>
              <li>Waiting time and front-office processes remain priority improvement opportunities.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}

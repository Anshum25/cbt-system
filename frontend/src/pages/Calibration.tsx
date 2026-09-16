import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ArrowRight, User, Cpu } from 'lucide-react';

const Calibration = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const response = await axios.get('/api/calibration');
        setSamples(response.data);
      } catch (error) {
        console.error("Error fetching calibration data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, []);

  if (loading) return <div className="card text-center text-muted">Loading Calibration Data...</div>;

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: '100%' }}>
      <div className="header-actions" style={{ marginBottom: '1.5rem', justifyContent: 'flex-start', gap: '0.75rem' }}>
        <Activity style={{ color: 'var(--primary-color)' }} size={32} />
        <h2>Evaluation Calibration Dashboard</h2>
      </div>
      
      <p className="text-muted" style={{ marginBottom: '2rem', maxWidth: '48rem' }}>
        This dashboard allows you to benchmark different AI models and prompt versions against human-verified scores. 
        It highlights discrepancies where the AI under-scored or over-scored relative to the Teacher's final verdict.
      </p>

      {samples.length === 0 ? (
        <div className="card text-center text-muted">
          No calibration samples collected yet. 
          Finalize some Teacher Reviews to populate this dashboard.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table>
            <thead style={{ borderBottom: '1px solid var(--card-border)' }}>
              <tr>
                <th>Sample ID</th>
                <th>Question ID</th>
                <th style={{ textAlign: 'center' }}>Human Score</th>
                <th style={{ textAlign: 'center' }}>AI Score</th>
                <th style={{ textAlign: 'center' }}>Delta</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, idx) => {
                const delta = (sample.ai_score || 0) - sample.human_score;
                return (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sample.id.split('-')[0]}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sample.question_id.split('-')[0]}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      <div className="flex items-center justify-center gap-2">
                        <User size={16} className="text-muted" />
                        {sample.human_score}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      <div className="flex items-center justify-center gap-2">
                        <Cpu size={16} />
                        {sample.ai_score}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${
                        Math.abs(delta) < 0.5 ? 'badge-success' :
                        Math.abs(delta) <= 2.0 ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {sample.details ? JSON.parse(sample.details).notes : 'No specific notes'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calibration;

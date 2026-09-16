import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Check, X, Edit2, AlertTriangle, Save } from 'lucide-react';

const EvaluationReview = () => {
  const { answerId } = useParams();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modifiedScore, setModifiedScore] = useState<number>(0);
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchEvaluation = async () => {
      try {
        const response = await axios.get(`/api/answers/${answerId}/evaluation`);
        setEvaluation(response.data);
        setModifiedScore(response.data.total_score);
      } catch (error) {
        console.error("Error fetching evaluation", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvaluation();
  }, [answerId]);

  const handleSubmitReview = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/answers/${answerId}/review`, {
        teacher_id: "00000000-0000-0000-0000-000000000001", // Placeholder
        modified_score: modifiedScore,
        comments: comments
      });
      alert("Review saved successfully!");
      navigate('/exams'); // Go back to exams list or dashboard
    } catch (error) {
      console.error("Error saving review", error);
      alert("Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card text-center text-muted">Loading Evaluation Data...</div>;
  if (!evaluation) return <div className="card text-center" style={{ color: 'var(--danger)' }}>Evaluation not found. Ensure OCR is completed and AI has evaluated.</div>;

  return (
    <div className="animate-fade-in" style={{ height: '100%', overflowY: 'auto' }}>
      <div className="header-actions">
        <h2>AI Evaluation Review</h2>
        {evaluation.needs_human_review && (
          <div className="badge badge-warning" style={{ display: 'flex', alignItems: 'center' }}>
            <AlertTriangle size={16} style={{ marginRight: '0.5rem' }} />
            Human Review Recommended (Low Confidence)
          </div>
        )}
      </div>
      
      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {/* Left Column: Summary & Final Decision */}
        <div className="flex flex-col gap-6" style={{ gridColumn: '1 / -1', lgGridColumn: 'span 1' }}>
          <div className="card">
            <h3 className="font-bold mb-4" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>Evaluation Summary</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-muted">AI Confidence:</span>
                <span className={`font-bold ${evaluation.confidence < 0.6 ? 'text-red-500' : 'text-green-500'}`} style={{ color: evaluation.confidence < 0.6 ? 'var(--danger)' : 'var(--success)' }}>
                  {(evaluation.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xl">
                <span className="font-bold">AI Score:</span>
                <span className="font-bold" style={{ color: 'var(--primary-color)' }}>{evaluation.total_score}</span>
              </div>
              
              <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--card-border)' }}>
                <label className="text-sm font-bold text-muted mb-2 block">Final Score (Override if needed)</label>
                <input 
                  type="number" 
                  step="0.5"
                  className="form-input text-lg font-bold"
                  value={modifiedScore}
                  onChange={(e) => setModifiedScore(parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-muted mb-2 block">Teacher Comments</label>
                <textarea 
                  className="form-input"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why you changed the score..."
                />
              </div>
              
              <button 
                onClick={handleSubmitReview}
                disabled={saving}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
              >
                <Save size={18} /> {saving ? "Saving..." : "Finalize Evaluation"}
              </button>
            </div>
          </div>
          
          <div className="card">
             <h3 className="font-bold mb-4" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>AI Reasoning</h3>
             <p className="text-sm" style={{ whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>{evaluation.reasoning}</p>
             
             {evaluation.missing_concepts.length > 0 && (
               <div className="mt-4">
                 <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--danger)' }}>Missing Concepts:</h4>
                 <ul className="text-sm text-muted" style={{ paddingLeft: '1.25rem', listStyle: 'disc' }}>
                   {evaluation.missing_concepts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                 </ul>
               </div>
             )}
             
             {evaluation.incorrect_concepts.length > 0 && (
               <div className="mt-4">
                 <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--warning)' }}>Incorrect Concepts:</h4>
                 <ul className="text-sm text-muted" style={{ paddingLeft: '1.25rem', listStyle: 'disc' }}>
                   {evaluation.incorrect_concepts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                 </ul>
               </div>
             )}
          </div>
        </div>
        
        {/* Right Column: Criterion Breakdown */}
        <div className="flex flex-col gap-4" style={{ gridColumn: '1 / -1', lgGridColumn: 'span 2' }}>
          <h3 className="text-xl font-bold mb-2">Criterion Breakdown</h3>
          {evaluation.criteria.map((crit: any, idx: number) => (
            <div key={idx} className="card">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <span className="font-bold">Criterion {idx + 1}</span>
                  <span className={`badge ${
                    crit.status === 'PRESENT' ? 'badge-success' :
                    crit.status === 'PARTIALLY_PRESENT' ? 'badge-warning' :
                    crit.status === 'ABSENT' ? 'badge-danger' :
                    'badge-danger'
                  }`}>
                    {crit.status}
                  </span>
                </div>
                <div className="badge" style={{ background: 'rgba(14, 165, 233, 0.2)', color: 'var(--primary-color)' }}>
                  Marks: {crit.awarded_marks}
                </div>
              </div>
              
              <div className="text-sm" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
                <span className="font-bold text-muted mb-2 block" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Evidence from Student Answer:</span>
                "{crit.evidence || crit.explanation}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EvaluationReview;

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Check, X, Edit2, RotateCcw } from 'lucide-react';

const OCRReview = () => {
  const { answerId } = useParams();
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await axios.get(`/api/answers/${answerId}/ocr`);
        setOcrResults(response.data);
      } catch (error) {
        console.error("Error fetching OCR results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [answerId]);

  const handleSave = async (ocrId: string) => {
    try {
      await axios.post(`/api/answers/${answerId}/ocr/${ocrId}/correct`, {
        text: editValue
      });
      setOcrResults(ocrResults.map(r => r.id === ocrId ? { ...r, corrected_text: editValue } : r));
      setEditingId(null);
    } catch (error) {
      console.error("Error saving correction", error);
    }
  };

  if (loading) return <div className="card text-center text-muted">Loading OCR Data...</div>;

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: '100%' }}>
      <div className="header-actions">
        <h2>OCR Review</h2>
      </div>
      
      {ocrResults.length === 0 ? (
        <div className="card text-center text-muted">No OCR results found for this answer.</div>
      ) : (
        <div className="flex gap-6" style={{ flex: 1, overflow: 'hidden' }}>
          {/* We assume page 1 for simplicity in this view */}
          <div className="card flex flex-col" style={{ width: '50%', padding: 0, overflow: 'hidden' }}>
             <div className="font-bold text-sm" style={{ padding: '0.75rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
               Original Image
             </div>
             <div className="flex items-center justify-between text-muted" style={{ flex: 1, padding: '1rem', overflow: 'auto', justifyContent: 'center' }}>
               {/* In a real app, this would be an <img src={...} /> referencing the actual processed image path */}
               [Image Preview Area]
             </div>
          </div>
          
          <div className="flex flex-col gap-4" style={{ width: '50%', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {ocrResults.map((result) => (
              <div key={result.id} className="card flex flex-col" style={{ padding: 0 }}>
                <div className="flex justify-between items-center" style={{ padding: '0.75rem', borderBottom: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
                  <div>
                    <span className="font-bold text-sm">Provider:</span> <span className="text-sm">{result.provider_name}</span>
                    <span className="font-bold text-sm" style={{ marginLeft: '1rem' }}>Confidence:</span> 
                    <span className={`badge ${result.confidence < 0.6 ? 'badge-danger' : 'badge-success'}`} style={{ marginLeft: '0.25rem' }}>
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {editingId !== result.id && (
                      <button 
                        onClick={() => {
                          setEditingId(result.id);
                          setEditValue(result.corrected_text || result.extracted_text);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem' }}
                        title="Edit Text"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={{ padding: '1rem' }}>
                  {editingId === result.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="text-sm"
                        style={{ width: '100%', height: '160px', padding: '0.5rem', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)', color: 'inherit', fontFamily: 'monospace' }}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        dir="auto"
                      />
                      <div className="flex justify-between gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="btn btn-secondary"
                        >
                          <X size={16} /> Cancel
                        </button>
                        <button 
                          onClick={() => handleSave(result.id)}
                          className="btn btn-primary"
                        >
                          <Check size={16} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm" style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)', minHeight: '10rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                      {result.corrected_text || result.extracted_text}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRReview;

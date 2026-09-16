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
        const response = await axios.get(`http://localhost:8000/api/answers/${answerId}/evaluation`);
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
      await axios.post(`http://localhost:8000/api/answers/${answerId}/review`, {
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

  if (loading) return <div className="p-8">Loading Evaluation Data...</div>;
  if (!evaluation) return <div className="p-8 text-red-500">Evaluation not found. Ensure OCR is completed and AI has evaluated.</div>;

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">AI Evaluation Review</h2>
        {evaluation.needs_human_review && (
          <div className="flex items-center text-orange-600 bg-orange-100 px-3 py-1 rounded">
            <AlertTriangle size={18} className="mr-2" />
            Human Review Recommended (Low Confidence)
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Final Decision */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white p-6 rounded border shadow-sm">
            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Evaluation Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">AI Confidence:</span>
                <span className={`font-bold ${evaluation.confidence < 0.6 ? 'text-red-500' : 'text-green-500'}`}>
                  {(evaluation.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xl">
                <span className="font-semibold text-gray-800">AI Score:</span>
                <span className="font-bold text-blue-600">{evaluation.total_score}</span>
              </div>
              
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-1">Final Score (Override if needed)</label>
                <input 
                  type="number" 
                  step="0.5"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                  value={modifiedScore}
                  onChange={(e) => setModifiedScore(parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Comments</label>
                <textarea 
                  className="w-full p-2 border rounded"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why you changed the score..."
                />
              </div>
              
              <button 
                onClick={handleSubmitReview}
                disabled={saving}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium flex items-center justify-center gap-2"
              >
                <Save size={18} /> {saving ? "Saving..." : "Finalize Evaluation"}
              </button>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded border shadow-sm">
             <h3 className="text-lg font-semibold border-b pb-2 mb-4">AI Reasoning</h3>
             <p className="text-gray-700 text-sm whitespace-pre-wrap">{evaluation.reasoning}</p>
             
             {evaluation.missing_concepts.length > 0 && (
               <div className="mt-4">
                 <h4 className="font-semibold text-red-600 text-sm mb-1">Missing Concepts:</h4>
                 <ul className="list-disc pl-5 text-sm text-gray-600">
                   {evaluation.missing_concepts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                 </ul>
               </div>
             )}
             
             {evaluation.incorrect_concepts.length > 0 && (
               <div className="mt-4">
                 <h4 className="font-semibold text-orange-600 text-sm mb-1">Incorrect Concepts:</h4>
                 <ul className="list-disc pl-5 text-sm text-gray-600">
                   {evaluation.incorrect_concepts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                 </ul>
               </div>
             )}
          </div>
        </div>
        
        {/* Right Column: Criterion Breakdown */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h3 className="text-xl font-semibold mb-2">Criterion Breakdown</h3>
          {evaluation.criteria.map((crit: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded border shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700">Criterion {idx + 1}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    crit.status === 'PRESENT' ? 'bg-green-100 text-green-800' :
                    crit.status === 'PARTIALLY_PRESENT' ? 'bg-yellow-100 text-yellow-800' :
                    crit.status === 'ABSENT' ? 'bg-gray-100 text-gray-800' :
                    crit.status === 'UNCERTAIN' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {crit.status}
                  </span>
                </div>
                <div className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded">
                  Marks: {crit.awarded_marks}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-800 border font-serif mb-2">
                <span className="font-semibold text-xs text-gray-500 uppercase block mb-1">Evidence from Student Answer:</span>
                "{crit.explanation}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EvaluationReview;

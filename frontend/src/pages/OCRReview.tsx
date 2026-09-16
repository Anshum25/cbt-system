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
        const response = await axios.get(`http://localhost:8000/api/answers/${answerId}/ocr`);
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
      await axios.post(`http://localhost:8000/api/answers/${answerId}/ocr/${ocrId}/correct`, {
        text: editValue
      });
      setOcrResults(ocrResults.map(r => r.id === ocrId ? { ...r, corrected_text: editValue } : r));
      setEditingId(null);
    } catch (error) {
      console.error("Error saving correction", error);
    }
  };

  if (loading) return <div className="p-8">Loading OCR Data...</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-6">OCR Review</h2>
      
      {ocrResults.length === 0 ? (
        <div className="bg-white p-6 rounded border">No OCR results found for this answer.</div>
      ) : (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* We assume page 1 for simplicity in this view */}
          <div className="w-1/2 bg-gray-200 border rounded flex flex-col">
             <div className="p-2 border-b bg-gray-50 font-medium">Original Image</div>
             <div className="flex-1 p-4 overflow-auto flex items-center justify-center text-gray-500">
               {/* In a real app, this would be an <img src={...} /> referencing the actual processed image path */}
               [Image Preview Area]
             </div>
          </div>
          
          <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
            {ocrResults.map((result) => (
              <div key={result.id} className="bg-white border rounded shadow-sm flex flex-col">
                <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-sm">Provider:</span> {result.provider_name}
                    <span className="ml-4 font-semibold text-sm">Confidence:</span> 
                    <span className={`ml-1 ${result.confidence < 0.6 ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                      {(result.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    {editingId !== result.id && (
                      <button 
                        onClick={() => {
                          setEditingId(result.id);
                          setEditValue(result.corrected_text || result.extracted_text);
                        }}
                        className="p-1 hover:bg-gray-200 rounded text-gray-600"
                        title="Edit Text"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  {editingId === result.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="w-full h-40 p-2 border rounded font-mono text-sm"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        dir="auto"
                      />
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 border rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                        >
                          <X size={16} /> Cancel
                        </button>
                        <button 
                          onClick={() => handleSave(result.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Check size={16} /> Save Correction
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-sm whitespace-pre-wrap p-2 bg-gray-50 rounded border min-h-[10rem]">
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

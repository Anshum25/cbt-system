import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ArrowRight, User, Cpu } from 'lucide-react';

const Calibration = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/calibration');
        setSamples(response.data);
      } catch (error) {
        console.error("Error fetching calibration data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, []);

  if (loading) return <div className="p-8">Loading Calibration Data...</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="text-blue-600" size={32} />
        <h2 className="text-2xl font-bold">Evaluation Calibration Dashboard</h2>
      </div>
      
      <p className="text-gray-600 mb-8 max-w-3xl">
        This dashboard allows you to benchmark different AI models and prompt versions against human-verified scores. 
        It highlights discrepancies where the AI under-scored or over-scored relative to the Teacher's final verdict.
      </p>

      {samples.length === 0 ? (
        <div className="bg-white p-6 rounded border text-center text-gray-500">
          No calibration samples collected yet. 
          Finalize some Teacher Reviews to populate this dashboard.
        </div>
      ) : (
        <div className="bg-white border rounded shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Sample ID</th>
                <th className="p-4 font-semibold text-gray-600">Question ID</th>
                <th className="p-4 font-semibold text-gray-600 text-center">Human Score</th>
                <th className="p-4 font-semibold text-gray-600 text-center">AI Score</th>
                <th className="p-4 font-semibold text-gray-600 text-center">Delta</th>
                <th className="p-4 font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, idx) => {
                const delta = (sample.ai_score || 0) - sample.human_score;
                return (
                  <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-mono text-xs text-gray-500">{sample.id.split('-')[0]}</td>
                    <td className="p-4 font-mono text-xs text-gray-500">{sample.question_id.split('-')[0]}</td>
                    <td className="p-4 text-center font-bold text-gray-800">
                      <div className="flex items-center justify-center gap-2">
                        <User size={16} className="text-gray-400" />
                        {sample.human_score}
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-blue-600">
                      <div className="flex items-center justify-center gap-2">
                        <Cpu size={16} className="text-blue-400" />
                        {sample.ai_score}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded font-bold text-sm ${
                        Math.abs(delta) < 0.5 ? 'bg-green-100 text-green-700' :
                        Math.abs(delta) <= 2.0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {sample.details ? JSON.parse(sample.details).notes : 'No specific notes'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Calibration;

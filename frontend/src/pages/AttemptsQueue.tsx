import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const AttemptsQueue = () => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const res = await axios.get('/api/attempts');
        setAttempts(res.data);
      } catch (error) {
        console.error("Failed to fetch attempts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EVALUATED':
      case 'FINALIZED':
      case 'COMPLETED':
        return <span className="badge badge-success flex items-center gap-1"><CheckCircle size={12} /> Evaluated</span>;
      case 'REVIEW_REQUIRED':
        return <span className="badge badge-warning flex items-center gap-1"><AlertTriangle size={12} /> Needs Review</span>;
      default:
        return <span className="badge badge-warning flex items-center gap-1"><Clock size={12} /> Processing</span>;
    }
  };

  if (loading) {
    return <div className="text-center p-8 text-muted">Loading queue...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="header-actions">
        <div>
          <h2 className="text-3xl font-bold">Attempts Queue</h2>
          <p className="text-muted mt-1">Monitor recent student submissions across all exams.</p>
        </div>
      </div>

      <div className="card">
        {attempts.length === 0 ? (
          <div className="text-center text-muted p-8">
            <p>No student attempts in the queue.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(attempt => (
                  <tr key={attempt.id}>
                    <td className="font-medium">{attempt.student_name}</td>
                    <td className="text-muted">{new Date(attempt.created_at).toLocaleString()}</td>
                    <td>{getStatusBadge(attempt.status)}</td>
                    <td>
                      <Link to={`/exams/${attempt.exam_id}/attempts`} className="btn btn-secondary text-sm">
                        View Exam Results
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttemptsQueue;

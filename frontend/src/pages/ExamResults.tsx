import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';

const ExamResults = () => {
  const { examId } = useParams();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);

  useEffect(() => {
    // Fetch exam details and attempts
    const fetchData = async () => {
      try {
        const examRes = await axios.get(`/api/exams/${examId}`);
        setExam(examRes.data);
        
        const attemptsRes = await axios.get(`/api/exams/${examId}/attempts`);
        setAttempts(attemptsRes.data);
      } catch (error) {
        console.error("Failed to fetch exam results", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId]);

  if (loading) {
    return <div className="text-center p-8 text-muted">Loading results...</div>;
  }

  const getAttemptStatus = (attempt: any) => {
    if (attempt.answers && attempt.answers.length > 0) {
      // Since currently it's 1 answer per upload, we can just use the first answer's status
      // or check if any are REVIEW_REQUIRED, etc.
      const hasReviewRequired = attempt.answers.some((a: any) => a.status === 'REVIEW_REQUIRED');
      if (hasReviewRequired) return 'REVIEW_REQUIRED';
      
      const allFinalized = attempt.answers.every((a: any) => a.status === 'FINALIZED' || a.status === 'EVALUATED');
      if (allFinalized) return 'EVALUATED';
      
      return attempt.answers[0].status;
    }
    return attempt.status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EVALUATED':
      case 'FINALIZED':
      case 'COMPLETED':
        return <span className="badge badge-success flex items-center gap-1"><CheckCircle size={12} /> Evaluated</span>;
      case 'REVIEW_REQUIRED':
        return <span className="badge badge-warning flex items-center gap-1"><AlertTriangle size={12} /> Needs Review</span>;
      default:
        return <span className="badge badge-warning flex items-center gap-1"><Clock size={12} /> {status}</span>;
    }
  };

  const calculateTotalScore = (answers: any[]) => {
    return answers.reduce((total: number, ans: any) => {
      return total + (ans.teacher_final_score !== null ? ans.teacher_final_score : (ans.ai_score || 0));
    }, 0);
  };

  return (
    <div className="animate-fade-in">
      <div className="header-actions">
        <div>
          <Link to="/exams" className="text-muted hover:text-white flex items-center gap-2 mb-2 text-sm">
            <ArrowLeft size={16} /> Back to Exams
          </Link>
          <h2 className="text-3xl font-bold">{exam?.title} Results</h2>
          <p className="text-muted mt-1">{exam?.description}</p>
        </div>
      </div>

      <div className="card">
        {attempts.length === 0 ? (
          <div className="text-center text-muted p-8">
            <p>No student attempts found for this exam.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Enrollment No.</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th>Total Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(attempt => (
                  <tr key={attempt.id}>
                    <td className="font-medium">{attempt.student_name}</td>
                    <td className="text-muted">{attempt.enrollment_number}</td>
                    <td className="text-muted">{new Date(attempt.created_at).toLocaleString()}</td>
                    <td>{getStatusBadge(getAttemptStatus(attempt))}</td>
                    <td className="font-bold text-lg text-primary-color">
                      {calculateTotalScore(attempt.answers).toFixed(1)}
                    </td>
                    <td>
                      {/* For now we just link to the first answer if it exists */}
                      {attempt.answers.length > 0 ? (
                         <Link to={`/answers/${attempt.answers[0].id}/status`} className="btn btn-secondary text-sm">
                           View Details
                         </Link>
                      ) : (
                         <span className="text-muted text-sm">No Answers</span>
                      )}
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

export default ExamResults;

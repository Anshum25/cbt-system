import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, Loader, User, Hash } from 'lucide-react';

const UploadAttempt = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [questionId, setQuestionId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");

  const [studentAnswerFile, setStudentAnswerFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    // Fetch the exam's questions
    const fetchQuestions = async () => {
      try {
        const res = await axios.get(`/api/exams/${examId}/questions`);
        setQuestions(res.data);
        if (res.data.length > 0) {
          setQuestionId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to fetch questions for this exam.");
      }
    };
    fetchQuestions();
  }, [examId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAnswerFile || !questionId) {
      setError("Please select a file and enter a valid Question ID.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 1. Create Attempt
      const attemptRes = await axios.post('/api/attempts', {
        exam_id: examId,
        student_name: studentName,
        enrollment_number: enrollmentNumber,
        start_time: new Date().toISOString()
      });
      const attemptId = attemptRes.data.id;

      // 2. Create Student Answer Record
      const answerRes = await axios.post(`/api/attempts/${attemptId}/answers`, {}, {
        params: { question_id: questionId }
      });
      const answerId = answerRes.data.id;

      // 3. Upload Answer Page
      const formData = new FormData();
      formData.append("file", studentAnswerFile);
      
      await axios.post(`/api/answers/${answerId}/upload`, formData, {
        params: { page_number: 1 },
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert("Student answer successfully uploaded! It is now being processed by OCR and AI.");
      navigate(`/answers/${answerId}/status`);
    } catch (err: any) {
      console.error(err);
      let errMsg = "An error occurred during upload.";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errMsg = err.response.data.detail.map((d: any) => `${d.loc?.join('.')} : ${d.msg}`).join(", ");
        } else if (typeof err.response.data.detail === "string") {
          errMsg = err.response.data.detail;
        } else {
          errMsg = JSON.stringify(err.response.data.detail);
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="header-actions">
        <h2>Upload Student Attempt</h2>
      </div>
      
      {error && (
        <div className="badge badge-danger mb-4 w-full" style={{ padding: '1rem', display: 'block' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleUpload} className="card flex flex-col gap-6">
        <div>
          <label className="text-sm font-bold text-muted mb-2 block">Student Name</label>
          <div className="flex gap-2 items-center">
            <User className="text-muted" size={20} />
            <input type="text" className="form-input" required value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Enter student name" />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-muted mb-2 block">Enrollment Number</label>
          <div className="flex gap-2 items-center">
            <Hash className="text-muted" size={20} />
            <input type="text" className="form-input" required value={enrollmentNumber} onChange={e => setEnrollmentNumber(e.target.value)} placeholder="e.g. EN1001" />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-muted mb-2 block">Question</label>
          <select 
            className="form-input" 
            value={questionId} 
            onChange={e => setQuestionId(e.target.value)}
            disabled={questions.length === 0}
            required
          >
            {questions.length === 0 ? (
              <option value="">No questions found for this exam</option>
            ) : (
              questions.map((q, idx) => (
                <option key={q.id} value={q.id}>
                  Q{idx + 1}: {q.question_text.length > 50 ? q.question_text.substring(0, 50) + '...' : q.question_text}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <h3 className="font-bold text-lg border-b pb-2 mb-4 mt-4" style={{ borderColor: 'var(--card-border)' }}>Upload Student Answer Page</h3>
          <div className="border border-dashed rounded p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
            <input 
              type="file" 
              accept="image/*,application/pdf"
              id="studentAnswerUpload"
              style={{ display: 'none' }}
              onChange={(e) => setStudentAnswerFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="studentAnswerUpload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={18} /> {studentAnswerFile ? studentAnswerFile.name : "Select Image/PDF"}
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-4" style={{ padding: '1rem' }} disabled={loading}>
          {loading ? <Loader className="animate-spin" size={20} /> : <Upload size={20} />} 
          {loading ? 'Uploading & Processing...' : 'Upload & Start AI Review'}
        </button>
      </form>
    </div>
  );
};

export default UploadAttempt;

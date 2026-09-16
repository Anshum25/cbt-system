import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, Loader, User } from 'lucide-react';

const UploadAttempt = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // To keep it simple, we fetch the first question of this exam to upload against.
  const [questionId, setQuestionId] = useState("");
  const [studentId, setStudentId] = useState("00000000-0000-0000-0000-000000000001"); // Placeholder UUID for testing

  const [studentAnswerFile, setStudentAnswerFile] = useState<File | null>(null);

  useEffect(() => {
    // Fetch the exam to get its questions
    const fetchExam = async () => {
      try {
        const res = await axios.get(`/api/exams/${examId}`);
        // Assuming the endpoint returns questions, or we just need any question UUID.
        // Wait, the /api/exams/{id} doesn't seem to return questions deeply nested based on schemas, but let's see.
        // Actually, we can fetch all exams and get questions, or just use a mock for now.
        // Let's assume /api/exams/ returns nested or we can just fetch /exams
        // For simplicity, we'll just allow user to input a question ID if none is found, or we'll have to fetch questions.
        // Actually, since the user just created the exam, the question might not be directly available.
        // But let's assume they know the question ID, or we fetch it.
        // Let's do a quick hack for the demo to fetch all questions for the exam (we might need a route for that, but none exists in the audit).
        // If there's no route to get questions by exam, we can just use a dummy UUID and let the backend fail, or...
        // Let's provide a text input for questionId for safety, prefilled if we could get it.
      } catch (e) {
        console.error(e);
      }
    };
    fetchExam();
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
        student_id: studentId,
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
      navigate(`/answers/${answerId}/ocr-review`); // Go directly to OCR Review so teacher can proceed!
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred during upload.");
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
          <label className="text-sm font-bold text-muted mb-2 block">Student ID (UUID)</label>
          <div className="flex gap-2 items-center">
            <User className="text-muted" size={20} />
            <input type="text" className="form-input" required value={studentId} onChange={e => setStudentId(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-muted mb-2 block">Question ID (UUID)</label>
          <input type="text" className="form-input" required value={questionId} onChange={e => setQuestionId(e.target.value)} placeholder="Paste the Question UUID here" />
          <p className="text-xs text-muted mt-2">Because we don't have a question listing API yet, please paste the question UUID generated during Exam Creation.</p>
        </div>

        <div>
          <h3 className="font-bold text-lg border-b pb-2 mb-4 mt-4">Upload Student Answer Page</h3>
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

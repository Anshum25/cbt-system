import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, Plus, Loader } from 'lucide-react';

const CreateExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [examData, setExamData] = useState({
    title: "",
    description: "",
    subject_code: "",
    total_marks: 10
  });

  const [questionData, setQuestionData] = useState({
    question_text: "",
    max_marks: 10,
    topic_tags: [] as string[]
  });

  const [modelAnswerFile, setModelAnswerFile] = useState<File | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelAnswerFile) {
      setError("Please select a model answer image to upload.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      // 1. Create Exam
      const examRes = await axios.post('/api/exams', examData);
      const examId = examRes.data.id;

      // 2. Create Question
      const qRes = await axios.post(`/api/exams/${examId}/questions`, questionData);
      const questionId = qRes.data.id;

      // 3. Upload Model Answer
      const formData = new FormData();
      formData.append("file", modelAnswerFile);
      
      await axios.post(`/api/questions/${questionId}/model-answer`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(`Exam and model answer successfully created! It is now being processed by OCR.\n\nIMPORTANT: Please copy this Question ID to use for student uploads:\n\n${questionId}`);
      navigate('/exams');
    } catch (err: any) {
      console.error(err);
      let errMsg = "An error occurred during creation.";
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
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
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="header-actions">
        <h2>Create New Exam & Model Answer</h2>
      </div>
      
      {error && (
        <div className="badge badge-danger mb-4 w-full" style={{ padding: '1rem', display: 'block' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="card flex flex-col gap-6">
        <div>
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Exam Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-muted mb-2 block">Title</label>
              <input type="text" className="form-input" required value={examData.title} onChange={e => setExamData({...examData, title: e.target.value})} placeholder="e.g. Midterm 1" />
            </div>
            <div>
              <label className="text-sm font-bold text-muted mb-2 block">Subject Code</label>
              <input type="text" className="form-input" required value={examData.subject_code} onChange={e => setExamData({...examData, subject_code: e.target.value})} placeholder="e.g. CS101" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-sm font-bold text-muted mb-2 block">Description</label>
              <textarea className="form-input" rows={2} value={examData.description} onChange={e => setExamData({...examData, description: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-bold text-muted mb-2 block">Total Marks</label>
              <input type="number" className="form-input" required value={examData.total_marks} onChange={e => setExamData({...examData, total_marks: parseFloat(e.target.value)})} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Initial Question</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-bold text-muted mb-2 block">Question Text</label>
              <textarea className="form-input" rows={3} required value={questionData.question_text} onChange={e => setQuestionData({...questionData, question_text: e.target.value})} placeholder="Describe the question..." />
            </div>
            <div>
              <label className="text-sm font-bold text-muted mb-2 block">Max Marks</label>
              <input type="number" className="form-input" required value={questionData.max_marks} onChange={e => setQuestionData({...questionData, max_marks: parseFloat(e.target.value)})} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg border-b pb-2 mb-4">Upload Model Answer</h3>
          <div className="border border-dashed rounded p-6 text-center" style={{ borderColor: 'var(--card-border)', background: 'rgba(0,0,0,0.1)' }}>
            <input 
              type="file" 
              accept="image/*,application/pdf"
              id="modelAnswerUpload"
              style={{ display: 'none' }}
              onChange={(e) => setModelAnswerFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="modelAnswerUpload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={18} /> {modelAnswerFile ? modelAnswerFile.name : "Select Image/PDF"}
            </label>
            <p className="text-xs text-muted mt-2">Upload the perfect model answer for OCR and AI reference.</p>
          </div>
        </div>

        <button type="submit" className="btn btn-primary mt-4" style={{ padding: '1rem' }} disabled={loading}>
          {loading ? <Loader className="animate-spin" size={20} /> : <Plus size={20} />} 
          {loading ? 'Creating...' : 'Create Exam & Upload'}
        </button>
      </form>
    </div>
  );
};

export default CreateExam;

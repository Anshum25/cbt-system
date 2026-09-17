import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import React from 'react';
import { Home, FileText, Users, GraduationCap, Settings, CheckSquare, Activity } from 'lucide-react';
import OCRReview from './pages/OCRReview';
import EvaluationReview from './pages/EvaluationReview';
import Calibration from './pages/Calibration';
import CreateExam from './pages/CreateExam';
import UploadAttempt from './pages/UploadAttempt';
import ProcessingStatus from './pages/ProcessingStatus';
import ExamResults from './pages/ExamResults';
import AttemptsQueue from './pages/AttemptsQueue';
import { useState, useEffect } from 'react';
import axios from 'axios';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>CBT Admin</h1>
        </div>
        <nav className="sidebar-nav">
          <Link to="/" className="nav-link">
            <Home size={20} /> <span>Dashboard</span>
          </Link>
          <Link to="/exams" className="nav-link">
            <FileText size={20} /> <span>Exams</span>
          </Link>
          <Link to="/calibration" className="nav-link">
            <Activity size={20} /> <span>Calibration</span>
          </Link>
          <Link to="/attempts" className="nav-link">
            <GraduationCap size={20} /> <span>Attempts</span>
          </Link>
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({ total_exams: 0, pending_reviews: 0, total_attempts: 0, total_students: 0 });

  useEffect(() => {
    axios.get('/api/stats').then(res => setStats(res.data)).catch(console.error);
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="header-actions">
        <h2>Dashboard</h2>
      </div>
      <div className="stat-grid">
        <div className="card stat-card">
          <h3 className="stat-title">Total Exams</h3>
          <p className="stat-value">{stats.total_exams}</p>
        </div>
        <div className="card stat-card">
          <h3 className="stat-title">Pending Reviews</h3>
          <p className="stat-value">{stats.pending_reviews}</p>
        </div>
        <div className="card stat-card">
          <h3 className="stat-title">Total Attempts</h3>
          <p className="stat-value">{stats.total_attempts}</p>
        </div>
        <div className="card stat-card">
          <h3 className="stat-title">Total Students</h3>
          <p className="stat-value">{stats.total_students}</p>
        </div>
      </div>
    </div>
  );
};

const ExamsList = () => {
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    axios.get('/api/exams').then(res => setExams(res.data));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="header-actions">
        <h2>Exams</h2>
        <Link to="/exams/new" className="btn btn-primary">Create Exam</Link>
      </div>
      {exams.length === 0 ? (
        <div className="card text-center text-muted p-8">
          <p>No exams created yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {exams.map(exam => (
            <div key={exam.id} className="card flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{exam.title}</h3>
                <p className="text-sm text-muted">{exam.subject_code} - {exam.description}</p>
                <p className="text-xs text-muted font-mono mt-1">Exam ID: {exam.id}</p>
              </div>
              <div className="flex gap-2">
                <Link to={`/exams/${exam.id}/attempts`} className="btn btn-secondary">
                  View Results
                </Link>
                <Link to={`/exams/${exam.id}/attempts/new`} className="btn btn-primary">
                  Upload Attempt
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exams" element={<ExamsList />} />
          <Route path="/exams/new" element={<CreateExam />} />
          <Route path="/exams/:examId/attempts/new" element={<UploadAttempt />} />
          <Route path="/exams/:examId/attempts" element={<ExamResults />} />
          <Route path="/attempts" element={<AttemptsQueue />} />
          <Route path="/answers/:answerId/status" element={<ProcessingStatus />} />
          <Route path="/answers/:answerId/ocr-review" element={<OCRReview />} />
          <Route path="/answers/:answerId/evaluation" element={<EvaluationReview />} />
          <Route path="/calibration" element={<Calibration />} />
          {/* Other routes will be implemented here */}
          <Route path="*" element={<div className="card text-center">Page not found</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

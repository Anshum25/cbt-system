import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import React from 'react';
import { Home, FileText, Users, GraduationCap, Settings, CheckSquare, Activity } from 'lucide-react';
import OCRReview from './pages/OCRReview';
import EvaluationReview from './pages/EvaluationReview';
import Calibration from './pages/Calibration';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">CBT Admin</h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link to="/" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <Home size={20} /> <span>Dashboard</span>
          </Link>
          <Link to="/exams" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <FileText size={20} /> <span>Exams</span>
          </Link>
          <Link to="/calibration" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <Activity size={20} /> <span>Calibration</span>
          </Link>
          <Link to="/students" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <Users size={20} /> <span>Students</span>
          </Link>
          <Link to="/attempts" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <GraduationCap size={20} /> <span>Attempts</span>
          </Link>
          <Link to="/reviews" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <CheckSquare size={20} /> <span>Reviews</span>
          </Link>
          <Link to="/settings" className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
            <Settings size={20} /> <span>Settings</span>
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
};

const Dashboard = () => (
  <div>
    <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-gray-500 text-sm font-medium">Total Exams</h3>
        <p className="text-3xl font-bold mt-2">12</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-gray-500 text-sm font-medium">Pending Reviews</h3>
        <p className="text-3xl font-bold mt-2">5</p>
      </div>
    </div>
  </div>
);

const ExamsList = () => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-bold">Exams</h2>
      <Link to="/exams/new" className="bg-blue-600 text-white px-4 py-2 rounded">Create Exam</Link>
    </div>
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <p className="text-gray-500">No exams created yet.</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exams" element={<ExamsList />} />
          <Route path="/answers/:answerId/ocr-review" element={<OCRReview />} />
          <Route path="/answers/:answerId/evaluation" element={<EvaluationReview />} />
          <Route path="/calibration" element={<Calibration />} />
          {/* Other routes will be implemented here */}
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

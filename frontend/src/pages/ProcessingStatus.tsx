import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader, CheckCircle, AlertTriangle, ArrowRight, Eye, Edit3 } from 'lucide-react';

const STATUS_MESSAGES: Record<string, string> = {
  UPLOADING: 'Uploading Answer Sheet...',
  OCR_PENDING: 'Waiting for OCR Processing...',
  OCR_PROCESSING: 'Extracting text from image...',
  OCR_COMPLETED: 'OCR Completed. Preparing Evaluation...',
  EVALUATING: 'AI is evaluating the answer...',
  EVALUATED: 'Evaluation Complete!',
  REVIEW_REQUIRED: 'Human Review Required',
  ERROR: 'An error occurred during processing.'
};

const ProcessingStatus = () => {
  const { answerId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('UPLOADING');
  const [error, setError] = useState('');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchStatus = async () => {
      try {
        const res = await axios.get(`/api/answers/${answerId}`);
        const currentStatus = res.data.status;
        setStatus(currentStatus);

        if (currentStatus === 'EVALUATED' || currentStatus === 'REVIEW_REQUIRED' || currentStatus === 'ERROR') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch processing status.');
        clearInterval(interval);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 2 seconds
    interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [answerId]);

  const isDone = status === 'EVALUATED' || status === 'REVIEW_REQUIRED';
  const isError = status === 'ERROR';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="card text-center flex flex-col items-center gap-6" style={{ padding: '3rem 2rem' }}>
        
        {isError ? (
          <AlertTriangle size={64} className="text-danger" />
        ) : isDone ? (
          <CheckCircle size={64} className="text-success" />
        ) : (
          <Loader size={64} className="animate-spin text-primary" />
        )}

        <div>
          <h2 className="font-bold text-xl mb-2">Processing Status</h2>
          <p className="text-lg text-muted">
            {STATUS_MESSAGES[status] || status}
          </p>
        </div>

        {error && (
          <div className="badge badge-danger">
            {error}
          </div>
        )}

        {isDone && (
          <div className="flex flex-col gap-3 w-full mt-4">
            {status === 'REVIEW_REQUIRED' && (
              <Link to={`/answers/${answerId}/ocr-review`} className="btn btn-secondary flex justify-center w-full">
                <Edit3 size={18} /> Review OCR Results
              </Link>
            )}
            
            <Link to={`/answers/${answerId}/evaluation`} className="btn btn-primary flex justify-center w-full">
              <Eye size={18} /> View AI Evaluation <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingStatus;

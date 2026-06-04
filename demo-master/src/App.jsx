import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DriveProvider } from './contexts/DriveContext';
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DrivesList from './pages/DrivesList';
import DriveDashboard from './pages/DriveDashboard';
import RoundDetails from './pages/RoundDetails';
import SystemVerification from './pages/SystemVerification';
import CandidateCodingEnv from './pages/CandidateCodingEnv';
import CandidateHome from './pages/CandidateHome';
import CandidateExams from './pages/CandidateExams';
import CandidateExamDetail from './pages/CandidateExamDetail';

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'interviewer') return <Navigate to="/candidate/home" replace />;
  return children;
};

const CandidateRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'candidate') return <Navigate to="/" replace />;
  return children;
};

const AuthRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'candidate') return <Navigate to="/candidate/home" replace />;
  return <Navigate to="/" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <DriveProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Main layout routes - Admin Only */}
          <Route element={<AdminRoute><MainLayout /></AdminRoute>}>
            <Route path="/" element={<DrivesList />} />
          </Route>

          {/* Dashboard layout routes - Admin Only */}
          <Route path="/drive/:id" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
            <Route index element={<DriveDashboard />} />
            <Route path="round/:roundId" element={<RoundDetails />} />
          </Route>

          {/* Candidate Routes (No Layout) - Candidate Only */}
          <Route path="/candidate/home" element={<CandidateRoute><CandidateHome /></CandidateRoute>} />
          <Route path="/candidate/exams" element={<CandidateRoute><CandidateExams /></CandidateRoute>} />
          <Route path="/candidate/exam/:driveId" element={<CandidateRoute><CandidateExamDetail /></CandidateRoute>} />
          <Route path="/candidate/verify" element={<CandidateRoute><SystemVerification /></CandidateRoute>} />
          <Route path="/candidate/coding" element={<CandidateRoute><CandidateCodingEnv /></CandidateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </DriveProvider>
    </AuthProvider>
  );
}

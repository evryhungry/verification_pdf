import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import TemplateList from './pages/TemplateList';
import TemplateUploadPdf from './pages/TemplateUploadPdf';
import DocumentList from './pages/DocumentList';
import DocumentEditor from './pages/DocumentEditor';
import DocumentReview from './pages/DocumentReview';
import DocumentNew from './pages/DocumentNew';
import TaskDashboard from './pages/TaskDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { useAuthStore } from './stores/authStore';

// 인증이 필요한 페이지들을 감싸는 컴포넌트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const { initialize, isAuthenticated } = useAuthStore();

  // 앱 시작 시 저장된 토큰 복원 및 Authorization 헤더 설정
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Router>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* 보호된 라우트 */}
        <Route path="/" element={<Navigate to="/tasks" replace />} />
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <Layout>
                <TaskDashboard />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/templates" 
          element={
            <ProtectedRoute>
              <Layout>
                <TemplateList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/templates/pdf/upload" 
          element={
            <ProtectedRoute>
              <Layout>
                <TemplateUploadPdf />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents" 
          element={
            <ProtectedRoute>
              <Layout>
                <DocumentList />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents/new" 
          element={
            <ProtectedRoute>
              <Layout>
                <DocumentNew />
              </Layout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents/:id" 
          element={
            <ProtectedRoute>
              <DocumentEditor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents/:id/edit" 
          element={
            <ProtectedRoute>
              <DocumentEditor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents/:id/review" 
          element={
            <ProtectedRoute>
              <Layout>
                <DocumentReview />
              </Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;

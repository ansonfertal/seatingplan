import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { ExamDetailsScreen } from './pages/ExamDetailsScreen';
import { ClassroomsScreen } from './pages/ClassroomsScreen';
import { StudentsScreen } from './pages/StudentsScreen';
import { RulesScreen } from './pages/RulesScreen';
import { GenerateScreen } from './pages/GenerateScreen';
import { ReviewScreen } from './pages/ReviewScreen';
import { PreviewScreen } from './pages/PreviewScreen';
import { ExportScreen } from './pages/ExportScreen';
import { useAppStore } from './store/appStore';

function RouteRecorder() {
  const location = useLocation();
  const setLastActiveStep = useAppStore((state) => state.setLastActiveStep);

  useEffect(() => {
    setLastActiveStep(location.pathname || '/dashboard');
  }, [location.pathname, setLastActiveStep]);

  return null;
}

export function AppRouter() {
  return (
    <>
      <RouteRecorder />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/exam" element={<ExamDetailsScreen />} />
        <Route path="/classrooms" element={<ClassroomsScreen />} />
        <Route path="/students" element={<StudentsScreen />} />
        <Route path="/rules" element={<RulesScreen />} />
        <Route path="/generate" element={<GenerateScreen />} />
        <Route path="/review" element={<ReviewScreen />} />
        <Route path="/preview" element={<PreviewScreen />} />
        <Route path="/export" element={<ExportScreen />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

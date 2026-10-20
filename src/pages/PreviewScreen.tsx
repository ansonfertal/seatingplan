import React from 'react';
import { Navigate } from 'react-router-dom';

export const PreviewScreen: React.FC = () => {
  return <Navigate to="/review" replace />;
};

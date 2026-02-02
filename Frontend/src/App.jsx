import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import ISPDashboard from './pages/ISPDashboard';
import Loader from './components/Loader';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader fullScreen />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard based on role
        return <Navigate to={user.role === 'isp' ? '/isp/dashboard' : '/dashboard'} replace />;
    }

    return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <Loader fullScreen />;
    }

    if (user) {
        return <Navigate to={user.role === 'isp' ? '/isp/dashboard' : '/dashboard'} replace />;
    }

    return children;
};

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route
                path="/login"
                element={
                    <PublicRoute>
                        <Login />
                    </PublicRoute>
                }
            />
            <Route
                path="/register"
                element={
                    <PublicRoute>
                        <Register />
                    </PublicRoute>
                }
            />

            {/* User Routes */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['user']}>
                        <UserDashboard />
                    </ProtectedRoute>
                }
            />

            {/* ISP Routes */}
            <Route
                path="/isp/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['isp']}>
                        <ISPDashboard />
                    </ProtectedRoute>
                }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <div className="app">
                    <AppRoutes />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#1f2937',
                                color: '#f9fafb',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '0.5rem',
                            },
                            success: {
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#f9fafb',
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#f9fafb',
                                },
                            },
                        }}
                    />
                </div>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
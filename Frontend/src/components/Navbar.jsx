import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Activity } from 'lucide-react';
import Button from './Button';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="glass sticky top-0 z-50 border-b border-white/10">
            <div className="container">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to={isAuthenticated ? (user?.role === 'isp' ? '/isp/dashboard' : '/dashboard') : '/'} className="flex items-center gap-2">
                        <Activity className="text-indigo-400" size={28} />
                        <span className="text-xl font-bold gradient-text">Smart Fault Analyser</span>
                    </Link>

                    {/* User Menu */}
                    {isAuthenticated && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5">
                                <User size={18} className="text-gray-400" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{user?.fullName}</span>
                                    <span className="text-xs text-gray-400 capitalize">{user?.role}</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleLogout}>
                                <LogOut size={18} />
                                Logout
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

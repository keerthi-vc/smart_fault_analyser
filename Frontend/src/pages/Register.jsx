import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Activity, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user'
    });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const user = await register(
                formData.email,
                formData.password,
                formData.fullName,
                formData.role,
                formData.isp
            );
            toast.success(`Account created successfully! Welcome, ${user.fullName}`);

            // Redirect based on role
            if (user.role === 'isp') {
                navigate('/isp/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="card-glass p-8">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <Activity className="text-indigo-400" size={48} />
                    </div>

                    <h1 className="text-3xl font-bold text-center mb-2">Create Account</h1>
                    <p className="text-gray-400 text-center mb-8">Join Smart Fault Analyser</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Full Name"
                            name="fullName"
                            type="text"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={handleChange}
                            icon={User}
                            required
                        />

                        <Input
                            label="Email"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            icon={Mail}
                            required
                        />

                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={handleChange}
                            icon={Lock}
                            required
                        />

                        <Input
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            icon={Lock}
                            required
                        />

                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">
                                Account Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'user' })}
                                    className={`p-4 rounded-lg border-2 transition-all ${formData.role === 'user'
                                        ? 'border-indigo-500 bg-indigo-500/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <UserCircle className="mx-auto mb-2" size={24} />
                                    <div className="text-sm font-semibold">End User</div>
                                    <div className="text-xs text-gray-400 mt-1">Report issues</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, role: 'isp' })}
                                    className={`p-4 rounded-lg border-2 transition-all ${formData.role === 'isp'
                                        ? 'border-indigo-500 bg-indigo-500/10'
                                        : 'border-white/10 bg-white/5 hover:border-white/20'
                                        }`}
                                >
                                    <Activity className="mx-auto mb-2" size={24} />
                                    <div className="text-sm font-semibold">ISP Staff</div>
                                    <div className="text-xs text-gray-400 mt-1">Analyze faults</div>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-300 mb-2 block">
                                Internet Service Provider
                            </label>
                            <select
                                name="isp"
                                value={formData.isp || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            >
                                <option value="">Select your ISP</option>
                                <option value="Airtel">Airtel</option>
                                <option value="Jio">Jio</option>
                                <option value="BSNL">BSNL</option>
                                <option value="Vi">Vi (Vodafone Idea)</option>
                                <option value="ACT Fibernet">ACT Fibernet</option>
                                <option value="Hathway">Hathway</option>
                                <option value="Excitel">Excitel</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            className="w-full"
                            loading={loading}
                        >
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;

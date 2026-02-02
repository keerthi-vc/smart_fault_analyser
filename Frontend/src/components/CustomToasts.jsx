import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, CheckCircle2, Activity, Zap, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

// Custom toast for complaint submission - colorful full screen
export const showComplaintSubmittedToast = (complaintData) => {
    toast.custom(
        (t) => (
            <motion.div
                initial={{ y: '100vh' }}
                animate={{ y: t.visible ? 0 : '100vh' }}
                exit={{ y: '100vh' }}
                transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
                }}
            >
                <div className="text-center px-8">
                    {/* Animated Icon */}
                    <motion.div
                        animate={{
                            rotate: [0, 360],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="inline-flex p-8 bg-white/30 rounded-full mb-8 shadow-2xl"
                    >
                        <Activity className="text-white drop-shadow-lg" size={80} />
                    </motion.div>

                    {/* Content */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <Zap className="text-yellow-300 drop-shadow-lg" size={48} />
                            <h1 className="text-6xl font-black text-white drop-shadow-2xl">
                                Analyzing Network
                            </h1>
                            <Sparkles className="text-pink-300 drop-shadow-lg" size={48} />
                        </div>
                        <p className="text-2xl font-semibold text-white/90 drop-shadow-lg">
                            Running diagnostics on your connection
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="max-w-2xl mx-auto h-3 bg-white/30 rounded-full overflow-hidden shadow-xl mb-8">
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2.5, ease: "easeInOut" }}
                            className="h-full bg-gradient-to-r from-yellow-300 via-pink-300 to-white"
                        />
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-8 py-4 bg-white/30 hover:bg-white/40 text-white rounded-full transition-all text-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        ),
        {
            duration: 3000,
            position: 'top-center',
        }
    );
};

// Custom toast for issue resolution - colorful full screen
export const showIssueResolvedToast = (resolutionData) => {
    toast.custom(
        (t) => (
            <motion.div
                initial={{ y: '100vh' }}
                animate={{ y: t.visible ? 0 : '100vh' }}
                exit={{ y: '100vh' }}
                transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 50%, #a8ff78 100%)'
                }}
            >
                <div className="text-center px-8">
                    {/* Success Icon with Pop Animation */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{
                            scale: [0, 1.4, 1],
                            rotate: [0, 10, -10, 0]
                        }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex p-8 bg-white/30 rounded-full mb-8 shadow-2xl"
                    >
                        <CheckCircle2 className="text-white drop-shadow-lg" size={80} />
                    </motion.div>

                    {/* Content */}
                    <div className="mb-8">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <span className="text-7xl drop-shadow-lg">🎉</span>
                            <h1 className="text-6xl font-black text-white drop-shadow-2xl">
                                Issue Resolved!
                            </h1>
                            <span className="text-7xl drop-shadow-lg">✨</span>
                        </div>
                        <p className="text-2xl font-semibold text-white/90 drop-shadow-lg">
                            Network is back to normal
                        </p>
                    </div>

                    {/* Success Indicator */}
                    <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 p-6 bg-white/30 rounded-2xl mb-8 shadow-xl">
                        <Wifi className="text-white drop-shadow-lg" size={32} />
                        <span className="text-2xl text-white font-bold drop-shadow-lg">Connection Stable</span>
                        <div className="flex gap-2">
                            <motion.div
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="w-3 h-3 bg-white rounded-full shadow-lg"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                                className="w-3 h-3 bg-white rounded-full shadow-lg"
                            />
                            <motion.div
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                                className="w-3 h-3 bg-white rounded-full shadow-lg"
                            />
                        </div>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-8 py-4 bg-white/30 hover:bg-white/40 text-white rounded-full transition-all text-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        ),
        {
            duration: 4000,
            position: 'top-center',
        }
    );
};

// Custom toast for network error - colorful full screen
export const showNetworkErrorToast = (errorMessage) => {
    toast.custom(
        (t) => (
            <motion.div
                initial={{ y: '100vh' }}
                animate={{ y: t.visible ? 0 : '100vh' }}
                exit={{ y: '100vh' }}
                transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #eb3349 0%, #f45c43 50%, #ff8a00 100%)'
                }}
            >
                <div className="text-center px-8">
                    <motion.div
                        animate={{
                            rotate: [0, -15, 15, -15, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 0.6, repeat: 3 }}
                        className="inline-flex p-8 bg-white/30 rounded-full mb-8 shadow-2xl"
                    >
                        <Activity className="text-white drop-shadow-lg" size={80} />
                    </motion.div>

                    <div className="mb-8">
                        <h1 className="text-6xl font-black text-white mb-6 drop-shadow-2xl">
                            Connection Issue
                        </h1>
                        <p className="text-2xl font-semibold text-white/90 drop-shadow-lg">
                            {errorMessage || 'Please try again'}
                        </p>
                    </div>

                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-8 py-4 bg-white/30 hover:bg-white/40 text-white rounded-full transition-all text-xl font-bold shadow-xl hover:shadow-2xl hover:scale-105"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        ),
        {
            duration: 3000,
            position: 'top-center',
        }
    );
};

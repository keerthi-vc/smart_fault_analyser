import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, Shield, BarChart3, Zap, ArrowRight } from 'lucide-react';
import Button from '../components/Button';

const Landing = () => {
    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative overflow-hidden py-20">
                {/* Animated background */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500 rounded-full filter blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="container relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center max-w-4xl mx-auto"
                    >
                        <div className="flex justify-center mb-6">
                            <Activity className="text-indigo-400" size={64} />
                        </div>
                        <h1 className="text-6xl font-bold mb-6">
                            <span className="gradient-text">Smart Fault Analyser</span>
                        </h1>
                        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                            Intelligent network diagnostics and fault classification system.
                            Instantly identify whether issues originate from ISP infrastructure or application servers.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link to="/register">
                                <Button size="lg">
                                    Get Started
                                    <ArrowRight size={20} />
                                </Button>
                            </Link>
                            <Link to="/login">
                                <Button variant="secondary" size="lg">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
                        <p className="text-gray-400 text-lg">Everything you need for comprehensive network fault analysis</p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <div className="card-glass h-full p-8 text-center">
                                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 mb-6">
                                        <feature.icon size={32} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-gray-400">{feature.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="card-glass p-12 text-center"
                    >
                        <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-gray-300 text-lg mb-8">
                            Join hundreds of ISPs and users leveraging intelligent fault detection
                        </p>
                        <Link to="/register">
                            <Button size="lg">
                                Create Free Account
                                <ArrowRight size={20} />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

const features = [
    {
        icon: Zap,
        title: 'Real-time Diagnostics',
        description: 'Instant network analysis with comprehensive metrics including jitter, latency, and packet loss'
    },
    {
        icon: Shield,
        title: 'Intelligent Classification',
        description: 'AI-powered fault classification to accurately determine ISP vs Application issues'
    },
    {
        icon: BarChart3,
        title: 'Advanced Analytics',
        description: 'Detailed reports and trends to track network health and complaint patterns over time'
    }
];

export default Landing;

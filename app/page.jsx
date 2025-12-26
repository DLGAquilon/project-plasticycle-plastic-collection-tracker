import React from 'react';
import { 
    AlertTriangle, Camera, ListChecks, Trophy, Activity, Award, MapPin, 
    Zap, BookOpen, Maximize, Twitter, Facebook, Linkedin, Target, Users, BrainCircuit, Globe, ShieldCheck, TrendingUp
} from 'lucide-react';

import Image from 'next/image';

const ctaShadowStyle = {
    boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4), 0 4px 6px -2px rgba(16, 185, 129, 0.2)',
};

export default function Home() {
    // Hero Background Style
    const fullHeroBgStyle = {
        position: 'relative',
        backgroundImage: `
            radial-gradient(circle, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.9) 100%),
            url("https://images.pexels.com/photos/12894737/pexels-photo-12894737.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2")
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        backgroundAttachment: 'fixed',
    };

    return (
        <div className="bg-gray-50 text-gray-800 font-sans">
            {/* 1. Header/Navigation */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
                    <a href="#" className="flex items-center space-x-2 group">
                        <span className="text-3xl font-extrabold text-emerald-500 font-inter group-hover:text-emerald-600 transition-colors tracking-tight">PlastiCycle</span>
                    </a>
                    
                    {/* Navigation Buttons */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="#proposal" className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-emerald-500 font-inter transition-colors">Proposal</a>
                        <a href="#team" className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-emerald-500 font-inter transition-colors">Team</a>
                        <a href="#ai" className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-emerald-500 font-inter transition-colors">AI Integration</a>
                        <a href="#sdg" className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-emerald-500 font-inter transition-colors">SDGs</a>
                        <a href="#users" className="text-sm font-bold uppercase tracking-widest text-gray-600 hover:text-emerald-500 font-inter transition-colors">Target Users</a>
                    </nav>

                    <a 
                        href="#start" 
                        className="px-6 py-2 rounded-full font-bold text-white bg-emerald-500 hover:bg-emerald-600 transition duration-300 shadow-md font-inter text-sm"
                    >
                        Join Now
                    </a>
                </div>
            </header>

            <main>
                {/* 2. Hero Section */}
                <section 
                    id="hero" 
                    className="relative min-h-[90vh] flex items-center justify-center text-center overflow-hidden"
                    style={fullHeroBgStyle}
                >
                    <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-20">
                        <div className="space-y-8">
                            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight text-white font-inter drop-shadow-2xl">
                                Track Your Plastic, <br/>
                                <span className="text-emerald-400">Compete for the Planet.</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-100 max-w-2xl mx-auto drop-shadow-lg font-sans leading-relaxed">
                                A web-based plastic waste deposit tracking and inter-departmental competition system for MMCM.
                            </p>
                            <div className="pt-6">
                                <a 
                                    href="#proposal" 
                                    className="inline-block px-12 py-5 rounded-full font-bold text-xl text-indigo-950 bg-emerald-500 hover:bg-emerald-400 transition duration-300 transform hover:scale-105 font-inter"
                                    style={ctaShadowStyle}
                                >
                                    Explore the Project →
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Project Title and Proposal Page */}
                <section id="proposal" className="py-24 bg-white">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-4xl md:text-5xl font-black text-indigo-950 mb-6 font-inter tracking-tight">Project Proposal</h2>
                            <p className="text-gray-500 uppercase tracking-widest font-bold text-sm">Turning Waste into a Winning Game</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-start">
                            {/* Problem Section */}
                            <div className="bg-red-50 p-8 rounded-3xl border border-red-100 h-full">
                                <div className="flex items-center mb-6 text-red-600">
                                    <AlertTriangle className="w-8 h-8 mr-3" />
                                    <h3 className="text-2xl font-bold font-inter">The Problem</h3>
                                </div>
                                <p className="text-gray-700 leading-relaxed font-sans text-lg">
                                    Campus initiatives are often sporadic and poorly monitored. The lack of a centralized tracking system results in inconsistent participation, fewer accountability measures, and difficulty in evaluating departmental contributions.
                                </p>
                            </div>

                            {/* Solution Section */}
                            <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 h-full">
                                <div className="flex items-center mb-6 text-emerald-600">
                                    <ShieldCheck className="w-8 h-8 mr-3" />
                                    <h3 className="text-2xl font-bold font-inter">The Solution</h3>
                                </div>
                                <p className="text-gray-700 leading-relaxed font-sans text-lg">
                                    A centralized, web-based platform to log and track plastic deposits. By integrating competition, we foster consistent engagement, encouraging proper disposal habits and long-term environmental accountability within the MMCM Community.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Team Setup */}
                <section id="team" className="py-24 bg-slate-50 border-y border-slate-100">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-4xl font-black text-indigo-950 mb-16 font-inter tracking-tight uppercase">Team Setup</h2>
                        <div className="max-w-sm mx-auto">
                            <div className="group relative mb-8">
                                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative bg-white p-2 rounded-full inline-block">
                                    <img 
                                        src="/images/formal-image.jpg" 
                                        alt="Vin Benjamin Belandres" 
                                        className="w-48 h-48 rounded-full bg-slate-100 object-cover"
                                    />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-indigo-950 font-inter mb-2">Vin Benjamin Belandres</h3>
                            <div className="space-y-1">
                                <p className="text-emerald-600 font-bold font-inter uppercase tracking-tighter text-sm">Full Stack Developer</p>
                                <p className="text-emerald-600 font-bold font-inter uppercase tracking-tighter text-sm">UI/UX Designer</p>
                                <p className="text-emerald-600 font-bold font-inter uppercase tracking-tighter text-sm">Project Manager</p>
                                <a href="https://dlgaquilon.github.io/it103-fa1-portfolio/" className="block mt-8 text-emerald-500 font-bold font-inter uppercase tracking-tighter text-sm no-underline hover:underline text-emerald-600">View Portfolio</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. AI Integration Page */}
                <section id="ai" className="py-24 bg-indigo-950 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-6">
                                    <BrainCircuit className="w-10 h-10" />
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black mb-8 font-inter">AI-Driven <br/>Forecasting</h2>
                                <p className="text-xl text-indigo-100 font-sans leading-relaxed">
                                    PlastiCycle uses a sophisticated <span className="text-emerald-400 font-bold">Time-Series Forecasting Module</span> to predict plastic deposit trends. 
                                </p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <TrendingUp className="text-white w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold font-inter text-lg">Short-Term Predictions</h4>
                                        <p className="text-indigo-200 text-sm">Predicts collection volumes over a 2-3 month horizon using historical departmental data.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Target className="text-white w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold font-inter text-lg">Proactive Planning</h4>
                                        <p className="text-indigo-200 text-sm">Enables administrators to allocate waste management resources based on projected departmental performance.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. SDG Alignment */}
                <section id="sdg" className="py-24 bg-white">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <h2 className="text-4xl font-black text-indigo-950 mb-4 font-inter">SDG Alignment</h2>
                            <p className="text-gray-500 font-sans">Our mission is anchored in Global Goals for a sustainable future.</p>
                        </div>
                        
                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* SDG 12 */}
                            <div className="group overflow-hidden rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="h-48 bg-[#BF8D2C] flex items-center justify-center p-8 transition-transform group-hover:scale-105">
                                    <img src="/images/sdg-12.png" alt="SDG 12" className="h-40 w-auto object-contain" />
                                </div>
                                <div className="p-8">
                                    <h3 className="text-xl font-bold font-inter mb-4 text-indigo-950">Responsible Consumption</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        Shifts waste collection from sporadic events to a continuous, systematized process. Encourages proper recycling through structured tracking and departmental accountability.
                                    </p>
                                </div>
                            </div>

                            {/* SDG 11 */}
                            <div className="group overflow-hidden rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="h-48 bg-[#F99D26] flex items-center justify-center p-8 transition-transform group-hover:scale-105">
                                    <img src="/images/sdg-11.png" alt="SDG 11" className="h-40 w-auto object-contain" />
                                </div>
                                <div className="p-8">
                                    <h3 className="text-xl font-bold font-inter mb-4 text-indigo-950">Sustainable Communities</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        Treats MMCM as a micro-community, improving campus-level monitoring and generating data that informs long-term institutional sustainability policies.
                                    </p>
                                </div>
                            </div>

                            {/* SDG 13 */}
                            <div className="group overflow-hidden rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="h-48 bg-[#3F7E44] flex items-center justify-center p-8 transition-transform group-hover:scale-105">
                                    <img src="/images/sdg-13.png" alt="SDG 13" className="h-40 w-auto object-contain" />
                                </div>
                                <div className="p-8">
                                    <h3 className="text-xl font-bold font-inter mb-4 text-indigo-950">Climate Action</h3>
                                    <p className="text-gray-600 text-sm leading-relaxed">
                                        Influences student behavior through competition and high visibility, fostering lifelong habit formation rather than one-time participation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 7. Target Users Page */}
                <section id="users" className="py-24 bg-slate-50">
                    <div className="container mx-auto px-4">
                        <div className="text-center max-w-2xl mx-auto mb-16">
                            <h2 className="text-4xl font-black text-indigo-950 mb-4 font-inter uppercase">Who is this for?</h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Students */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                <Users className="w-12 h-12 text-emerald-500 mb-6" />
                                <h4 className="text-2xl font-bold font-inter text-indigo-950 mb-4">MMCM Students</h4>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4 font-sans italic">Primary User</p>
                                <p className="text-gray-600 text-base leading-relaxed font-sans">
                                    Provides a simple logging interface, clear departmental rankings, and immediate progress tracking to stay motivated.
                                </p>
                            </div>

                            {/* Coordinators */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                <Award className="w-12 h-12 text-teal-500 mb-6" />
                                <h4 className="text-2xl font-bold font-inter text-indigo-950 mb-4">Dept. Representatives</h4>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4 font-sans italic">Secondary User</p>
                                <p className="text-gray-600 text-base leading-relaxed font-sans">
                                    Requires tools to monitor internal engagement and access comparative insights to encourage team participation.
                                </p>
                            </div>

                            {/* Admin */}
                            <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                <Activity className="w-12 h-12 text-indigo-500 mb-6" />
                                <h4 className="text-2xl font-bold font-inter text-indigo-950 mb-4">School Administrators</h4>
                                <p className="text-gray-600 text-sm leading-relaxed mb-4 font-sans italic">Strategy User</p>
                                <p className="text-gray-600 text-base leading-relaxed font-sans">
                                    Relies on centralized collection records and forecasting insights to evaluate and support institutional sustainability.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 8. Final Call-to-Action */}
                <section id="start" className="py-24 bg-emerald-500 text-white">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
                        <h2 className="text-5xl md:text-6xl font-black mb-4 font-inter tracking-tight">Start Contributing.</h2>
                        <h2 className="text-5xl md:text-6xl font-black mb-4 font-inter tracking-tight">Start Competing.</h2>
                        <p className="text-xl text-emerald-50 mt-8 mb-10 leading-relaxed font-sans">
                            Join your fellow students and start turning plastic waste into departmental points today.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-6">
                            <a 
                                href="#" 
                                className="px-10 py-4 rounded-full font-bold text-lg text-emerald-600 bg-white hover:bg-emerald-50 transition duration-300 transform hover:scale-105 font-inter shadow-xl"
                            >
                                Launch Platform
                            </a>
                            <a 
                                href="#" 
                                className="px-10 py-4 rounded-full font-bold text-lg border-2 border-white text-white hover:bg-white/10 transition duration-300 font-inter"
                            >
                                Be A Volunteer
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            {/* 9. Footer */}
            <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-2">
                            <span className="text-3xl font-extrabold text-emerald-500 font-inter tracking-tight">PlastiCycle</span>
                            <p className="mt-4 max-w-xs leading-relaxed font-sans">
                                A data-driven approach to plastic waste management within the Mapúa Malayan Colleges Mindanao community.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-white font-bold font-inter mb-4 uppercase text-xs tracking-widest">Navigation</h5>
                            <ul className="space-y-2 text-sm">
                                <li><a href="#proposal" className="hover:text-emerald-400 transition">Proposal</a></li>
                                <li><a href="#ai" className="hover:text-emerald-400 transition">AI Technology</a></li>
                                <li><a href="#sdg" className="hover:text-emerald-400 transition">Sustainability</a></li>
                            </ul>
                        </div>
                        <div>
                            <h5 className="text-white font-bold font-inter mb-4 uppercase text-xs tracking-widest">Connect</h5>
                            <div className="flex space-x-4">
                                <Twitter className="w-5 h-5 cursor-pointer hover:text-emerald-400 transition" />
                                <Facebook className="w-5 h-5 cursor-pointer hover:text-emerald-400 transition" />
                                <Linkedin className="w-5 h-5 cursor-pointer hover:text-emerald-400 transition" />
                            </div>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-800 text-center text-xs tracking-widest uppercase">
                        &copy; {new Date().getFullYear()} PlastiCycle • Vin Benjamin Belandres • MMCM Sustainability Initiative
                    </div>
                </div>
            </footer>
        </div>
    );
}
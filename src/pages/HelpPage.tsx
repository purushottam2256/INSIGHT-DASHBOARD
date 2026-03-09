import { useState } from 'react';
import { 
    HelpCircle, ChevronDown, BookOpen,
    Smartphone, Monitor, UserCheck, Calendar, BarChart3, ClipboardList,
    Zap, Award, ArrowRight, PlayCircle, Fingerprint
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
    question: string;
    answer: string;
}

const faqs: FAQItem[] = [
    {
        question: "How do I take attendance using the mobile app?",
        answer: "Open the Attend-Me mobile app → Select the appropriate class and period → Mark students as Present, Absent, or OD → Submit the attendance session. The data syncs automatically to the INSIGHT dashboard."
    },
    {
        question: "How do I register new students?",
        answer: "Navigate to the Registration tab → Select 'Students' → Fill in the student details including name, roll number, department, year, and section → Click 'Register'. You can also use the 'Bulk CSV Import' feature to upload multiple students at once — download the template first for correct formatting."
    },
    {
        question: "How does leave management work?",
        answer: "Faculty submit leave requests through the mobile app. HODs can view pending requests in the Leave Manager → Review details → Accept or Decline with a comment. If the HOD approves, it escalates to the Principal for final approval. Student leave permissions can also be managed from the same Leave Manager tab."
    },
    {
        question: "Can I compare attendance between different classes?",
        answer: "Yes! Use the Compare tab to select 2 or more classes, choose a time period (week/month/semester), and view side-by-side trend charts. You can switch between area, line, and bar chart visualizations."
    },
    {
        question: "How do I manage the timetable?",
        answer: "Go to the Timetable tab → Step 1: Select department, year, section, semester → Step 2: Configure subjects and assign faculty → Step 3: Set class incharges → Step 4: Choose Auto or Manual mode to build the timetable grid → Cross-check and submit."
    },
    {
        question: "Who can access the dashboard?",
        answer: "Access is role-based: HODs see their department data, Principals and Management see all departments. Faculty members use only the mobile app. HODs can broadcast within their department. Principals can broadcast institution-wide."
    },
    {
        question: "How do I broadcast announcements?",
        answer: "Go to Broadcast from the sidebar → Click 'New Broadcast' → Choose a template or write a custom message → Set priority and audience → Send. HODs can broadcast to their department faculty. Principals can target all, specific departments, or HODs only."
    },
    {
        question: "How is data secured?",
        answer: "All data is stored in Supabase with PostgreSQL, using Row-Level Security (RLS) policies. Authentication is handled via Supabase Auth. All API requests use encrypted HTTPS connections. User passwords are never stored in plain text."
    },
];

const features = [
    { icon: Smartphone, title: "Mobile App", desc: "Real-time attendance via Attend-Me", color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Monitor, title: "Web Dashboard", desc: "Analytics, management, and admin", color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { icon: UserCheck, title: "Registration", desc: "Student & faculty secure onboarding", color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: Calendar, title: "Timetable", desc: "Auto/manual schedule clash detection", color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: BarChart3, title: "Analytics", desc: "Detailed attendance & class trends", color: "text-rose-500", bg: "bg-rose-500/10" },
    { icon: ClipboardList, title: "Leave Manager", desc: "Faculty & student permission flow", color: "text-cyan-500", bg: "bg-cyan-500/10" },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export function HelpPage() {
    const [openFAQ, setOpenFAQ] = useState<number | null>(0);
    const navigate = useNavigate();

    return (
        <div className="max-w-5xl mx-auto pb-12 overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="space-y-16"
            >
                {/* ═══ HERO SECTION ═══ */}
                <motion.section variants={itemVariants} className="text-center pt-8 pb-4 relative z-10">
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="inline-flex items-center justify-center p-3 mb-6 rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-inner"
                    >
                        <BookOpen className="h-10 w-10" strokeWidth={1.5} />
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-4">
                        INSIGHT <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">Knowledge Base</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
                        Master the platform with comprehensive guides, feature explorations, and direct support channels.
                    </p>
                </motion.section>

                {/* ═══ GETTING STARTED ═══ */}
                <motion.section variants={itemVariants} className="relative z-10">
                    <div className="flex items-center gap-3 mb-8 pl-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-orange-500/20 text-white">
                            <PlayCircle className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">The Core Pipeline</h2>
                    </div>
                    
                    <div className="relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-border/50 -translate-y-1/2 z-0" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                            {[
                                { step: '01', title: 'Onboard', desc: 'Register students & faculty via bulk CSV', icon: Fingerprint },
                                { step: '02', title: 'Schedule', desc: 'Build timetables and assign class incharges', icon: Calendar },
                                { step: '03', title: 'Execute', desc: 'Track daily attendance via Attend-Me app', icon: Smartphone },
                                { step: '04', title: 'Analyze', desc: 'Generate reports & manage permissions', icon: BarChart3 },
                            ].map((item) => (
                                <motion.div 
                                    whileHover={{ y: -8, transition: { duration: 0.2 } }}
                                    key={item.step} 
                                    className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group overflow-hidden relative"
                                >
                                    <div className="absolute -right-4 -top-4 text-9xl font-black text-muted/10 group-hover:text-primary/5 transition-colors duration-500 pointer-events-none select-none">
                                        {item.step}
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-muted/80 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                        <item.icon className="h-6 w-6 text-foreground group-hover:text-white transition-colors" strokeWidth={1.5} />
                                    </div>
                                    <h3 className="text-lg font-bold text-foreground mb-2 relative z-10">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{item.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.section>

                {/* ═══ CAPABILITIES ═══ */}
                <motion.section variants={itemVariants}>
                    <div className="flex items-center gap-3 mb-8 pl-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-lg shadow-blue-500/20 text-white">
                            <Award className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Platform Capabilities</h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {features.map((feature, i) => (
                            <motion.div 
                                key={i}
                                whileHover={{ scale: 1.02 }}
                                className="p-5 rounded-3xl bg-card border border-border/50 shadow-sm flex items-start gap-4 hover:border-primary/30 transition-all group cursor-default"
                            >
                                <div className={`w-12 h-12 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center shrink-0 border border-white/5`}>
                                    <feature.icon className="h-6 w-6" strokeWidth={1.5} />
                                </div>
                                <div className="pt-1">
                                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{feature.title}</h4>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* ═══ MODULE GUIDES ═══ */}
                <motion.section variants={itemVariants}>
                    <div className="flex items-center gap-3 mb-8 pl-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20 text-white">
                            <Zap className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Deep Dive Modules</h2>
                    </div>

                    <div className="bg-card/40 backdrop-blur-3xl rounded-[2.5rem] border border-border/60 shadow-xl overflow-hidden p-2 sm:p-4">
                        <Tabs defaultValue="registration" className="w-full">
                            <div className="overflow-x-auto pb-4 sm:pb-0 mb-6 scrollbar-none">
                                <TabsList className="flex w-max sm:w-full bg-muted/50 p-1.5 rounded-2xl">
                                    {['Registration', 'Timetable', 'Attendance', 'Leaves', 'Analytics'].map(tab => (
                                        <TabsTrigger 
                                            key={tab} 
                                            value={tab.toLowerCase()} 
                                            className="flex-1 rounded-xl py-2.5 text-sm font-semibold tracking-wide data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
                                        >
                                            {tab}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            <AnimatePresence mode="wait">
                                {/* Registration */}
                                <TabsContent value="registration" className="outline-none">
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
                                        <h3 className="text-2xl font-black text-foreground mb-6">Managing Identity & Roster</h3>
                                        <div className="space-y-6">
                                            {[
                                                { t: "Single Entity Creation", d: "Add individuals manually inside the Registration tab. Perfect for late admissions or mid-semester faculty additions." },
                                                { t: "Mass CSV Architecture", d: "Upload hundreds of records synchronously using our standard CSV templates for Students and Faculty." },
                                                { t: "Secure Access Parsing", d: "Upon faculty registration, accounts are automatically linked to their Attend-Me mobile app credentials seamlessly." }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex gap-4 items-start">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 border border-primary/20">{idx + 1}</div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground">{item.t}</h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.d}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                {/* Timetable */}
                                <TabsContent value="timetable" className="outline-none">
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
                                        <h3 className="text-2xl font-black text-foreground mb-6">Grid Architect</h3>
                                        <div className="space-y-6">
                                            {[
                                                { t: "Entity Definition", d: "Select the specific Department, Year, Section, and active academic parameters." },
                                                { t: "Subject-Faculty Matrix", d: "Map subjects to registered faculty members, establishing the maximum lecture credits allowed." },
                                                { t: "Smart Scheduling Core", d: "Invoke the Automatic builder for AI-assisted clash detection, or utilize the Manual builder for direct drag-and-drop overrides." }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex gap-4 items-start">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 border border-primary/20">{idx + 1}</div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground">{item.t}</h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.d}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                {/* Attendance */}
                                <TabsContent value="attendance" className="outline-none">
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
                                        <h3 className="text-2xl font-black text-foreground mb-6">Real-Time Trajectory</h3>
                                        <div className="space-y-6">
                                            {[
                                                { t: "Mobile Sync", d: "Core parsing is done via the Attend-Me iOS/Android application used by faculty directly in the classroom." },
                                                { t: "Bird's-Eye Overview", d: "Query any class across standard timeframes (day/week/month) to view an encompassing matrix of student presence." },
                                                { t: "Administrative Overrides", d: "HODs and Admins possess clearance to retroactively modify sessions or issue OD (On Duty) statuses to groups/individuals." }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex gap-4 items-start">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 border border-primary/20">{idx + 1}</div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground">{item.t}</h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.d}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                {/* Leaves */}
                                <TabsContent value="leaves" className="outline-none">
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
                                        <h3 className="text-2xl font-black text-foreground mb-6">Permission Control Flow</h3>
                                        <div className="space-y-6">
                                            {[
                                                { t: "Hierarchical Verification", d: "Faculty leave passes through an unalterable two-stage pipeline: HOD approval, followed by Principal finalization." },
                                                { t: "Student Permissions", d: "Authorize multi-day absences for students explicitly so their base aggregate calculations remain untampered." },
                                                { t: "FCM Push Alerts", d: "Key personnel are notified in real-time on their native devices regarding pending authorizations." }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex gap-4 items-start">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 border border-primary/20">{idx + 1}</div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground">{item.t}</h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.d}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                {/* Analytics */}
                                <TabsContent value="analytics" className="outline-none">
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 sm:p-8">
                                        <h3 className="text-2xl font-black text-foreground mb-6">Data Telemetry</h3>
                                        <div className="space-y-6">
                                            {[
                                                { t: "Visual Correlation", d: "Compare multidimensional class data utilizing dynamic area, line, or bar charts rendered at 60fps." },
                                                { t: "Defaulter Metrics", d: "Instantly isolate sub-75% standard or sub-65% detained student brackets across the entire academic ecosystem." },
                                                { t: "Encrypted Exports", d: "Spool high-fidelity reports into native .xlsx Excel worksheets for institutional archiving." }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex gap-4 items-start">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center shrink-0 border border-primary/20">{idx + 1}</div>
                                                    <div>
                                                        <h4 className="font-bold text-foreground">{item.t}</h4>
                                                        <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.d}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </TabsContent>
                            </AnimatePresence>
                        </Tabs>
                    </div>
                </motion.section>

                {/* ═══ FAQ SECTION ═══ */}
                <motion.section variants={itemVariants}>
                    <div className="flex items-center gap-3 mb-8 pl-4">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/20 text-white">
                            <HelpCircle className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Frequently Asked Questions</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {faqs.map((faq, i) => (
                            <motion.div 
                                key={i}
                                initial={false}
                                animate={{ backgroundColor: openFAQ === i ? 'var(--card-bg)' : 'transparent' }}
                                className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                                    openFAQ === i ? 'border-primary/50 shadow-lg shadow-primary/5 bg-card/80 backdrop-blur-xl' : 'border-border/60 hover:border-primary/30 bg-card/30'
                                }`}
                            >
                                <button
                                    onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                                    className="w-full flex items-center justify-between p-6 text-left group outline-none focus-visible:ring-2 ring-primary/50"
                                >
                                    <span className={`text-sm font-bold pr-4 transition-colors ${openFAQ === i ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                                        {faq.question}
                                    </span>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${openFAQ === i ? 'bg-primary text-primary-foreground border-primary rotate-180' : 'bg-muted border-border text-muted-foreground group-hover:border-primary/50'}`}>
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </button>
                                <AnimatePresence initial={false}>
                                    {openFAQ === i && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        >
                                            <div className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-4">
                                                {faq.answer}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* ═══ SUPPORT CTA ═══ */}
                <motion.section variants={itemVariants} className="mt-12">
                    <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-primary to-amber-500 p-10 md:p-14 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-primary/20">
                        {/* Decorative background shapes */}
                        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none mix-blend-overlay" />
                        
                        <div className="relative z-10 max-w-xl">
                            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">
                                Still encountering anomalies?
                            </h2>
                            <p className="text-primary-foreground/90 text-lg font-medium leading-relaxed">
                                Our development team monitors the Issues board directly. Submit logs, bug screenshots, or request new features securely through your settings profile.
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => navigate('/settings')}
                            className="relative z-10 shrink-0 inline-flex items-center gap-2 h-16 px-10 rounded-full bg-white text-primary font-black shadow-xl hover:scale-105 active:scale-95 transition-all outline-none"
                        >
                            Open Support Portal <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                </motion.section>

                {/* Footer */}
                <motion.footer variants={itemVariants} className="text-center pt-8 border-t border-border/40 mt-8">
                    <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground/60 flex items-center justify-center gap-2">
                        <span>INSIGHT OS v1.0.0</span> <span className="w-1 h-1 rounded-full bg-primary/50" /> <span>Engineered with ❤️ by PJ</span>
                    </p>
                </motion.footer>
            </motion.div>
        </div>
    );
}

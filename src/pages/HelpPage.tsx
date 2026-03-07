import { useState } from 'react';
import { 
    HelpCircle, MessageCircle, ChevronDown, BookOpen,
    Smartphone, Monitor, UserCheck, Calendar, BarChart3, ClipboardList,
    ExternalLink, Zap, Shield, Award
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    { icon: Smartphone, title: "Mobile App", desc: "Real-time attendance via the Attend-Me app" },
    { icon: Monitor, title: "Web Dashboard", desc: "Analytics, management, and administration" },
    { icon: UserCheck, title: "Registration", desc: "Student and faculty registration with bulk import" },
    { icon: Calendar, title: "Timetable", desc: "Auto or manual schedule builder with clash detection" },
    { icon: BarChart3, title: "Analytics", desc: "Detailed attendance trends and comparisons" },
    { icon: ClipboardList, title: "Leave Manager", desc: "Faculty & student leave with two-stage approval" },
];



export function HelpPage() {
    const [openFAQ, setOpenFAQ] = useState<number | null>(0);

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl">
           

            {/* Getting Started Section */}
            <section>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-primary" />
                    Getting Started
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                        { step: '1', title: 'Register Students & Faculty', desc: 'Use the Registration tab to add students individually or via bulk CSV import', color: 'from-primary to-amber-500' },
                        { step: '2', title: 'Build Timetable', desc: 'Configure subjects, assign faculty, and build schedules in the Timetable manager', color: 'from-amber-500 to-orange-400' },
                        { step: '3', title: 'Take Attendance', desc: 'Faculty use the Attend-Me mobile app to record daily attendance', color: 'from-orange-400 to-red-400' },
                        { step: '4', title: 'Analyze & Report', desc: 'View trends, compare classes, generate reports, and manage leaves', color: 'from-red-400 to-pink-500' },
                    ].map(item => (
                        <div key={item.step} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 group">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 text-white font-bold text-sm shadow-sm group-hover:scale-110 transition-transform`}>
                                {item.step}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Overview */}
            <section>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                    <Award className="h-5 w-5 text-primary" />
                    Features
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {features.map((feature, i) => {
                        const Icon = feature.icon;
                        return (
                            <div key={i} className="p-4 rounded-xl bg-card border border-border/50 shadow-sm text-center hover:border-primary/30 hover:shadow-md transition-all duration-200 group">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/15 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/15 transition-colors">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                                <p className="text-[11px] text-muted-foreground mt-1">{feature.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Module Guides */}
            <section>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Module Guides
                </h2>
                <Tabs defaultValue="registration" className="w-full">
                    <TabsList className="w-full flex flex-wrap justify-start bg-card border border-border/50 rounded-2xl p-1.5 h-auto gap-1 mb-4">
                        <TabsTrigger value="registration" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Registration</TabsTrigger>
                        <TabsTrigger value="timetable" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Timetable</TabsTrigger>
                        <TabsTrigger value="attendance" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Attendance</TabsTrigger>
                        <TabsTrigger value="leaves" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Leaves</TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-xl px-4 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="registration" className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4 animate-fade-in-up">
                        <h3 className="text-base font-bold text-primary">Managing Students & Faculty</h3>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                <div><p className="text-sm font-semibold">Single Registration</p><p className="text-xs text-muted-foreground mt-0.5">Fill in details manually for individual student or faculty additions. Select department, year, section, and enter roll number and name.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                <div><p className="text-sm font-semibold">Bulk CSV Import</p><p className="text-xs text-muted-foreground mt-0.5">Use the "Bulk CSV Import" button to upload many records at once. Download the template first to ensure correct formatting.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                <div><p className="text-sm font-semibold">Faculty Management</p><p className="text-xs text-muted-foreground mt-0.5">Add faculty members with their department, designation, and email. Faculty accounts are linked to the Attend-Me mobile app for attendance recording.</p></div>
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="timetable" className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4 animate-fade-in-up">
                        <h3 className="text-base font-bold text-primary">Building the Timetable</h3>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                <div><p className="text-sm font-semibold">Select Class</p><p className="text-xs text-muted-foreground mt-0.5">Choose Dept, Year, Section, Semester, Regulation, Academic Year, and Room. HODs see their department auto-selected.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                <div><p className="text-sm font-semibold">Assign Subjects & Faculty</p><p className="text-xs text-muted-foreground mt-0.5">Select subjects from the catalog and assign faculty members to each subject. Set weekly period counts.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                <div><p className="text-sm font-semibold">Set Class Incharges</p><p className="text-xs text-muted-foreground mt-0.5">Select two class incharges from the assigned faculty list. Their names appear on the printed timetable.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">4</div>
                                <div><p className="text-sm font-semibold">Build Grid (Auto or Manual)</p><p className="text-xs text-muted-foreground mt-0.5">Choose Automatic for AI-assisted scheduling (smart clash detection) or Manual for full control. Print the final timetable on A4 landscape.</p></div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4 animate-fade-in-up">
                        <h3 className="text-base font-bold text-primary">Monitoring Attendance</h3>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                <div><p className="text-sm font-semibold">Mobile App Recording</p><p className="text-xs text-muted-foreground mt-0.5">Faculty use the Attend-Me mobile app to record attendance in real-time. Data syncs instantly to the INSIGHT dashboard.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                <div><p className="text-sm font-semibold">Monthly Overview</p><p className="text-xs text-muted-foreground mt-0.5">Use the Monthly Overview tab to see a bird's-eye view of attendance for any class across the entire month, with per-student drill-down.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                <div><p className="text-sm font-semibold">Manual Overrides</p><p className="text-xs text-muted-foreground mt-0.5">Admins and HODs can edit past sessions, mark OD (On Duty), or toggle individual student presence directly from the dashboard.</p></div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="leaves" className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4 animate-fade-in-up">
                        <h3 className="text-base font-bold text-primary">Leave & Permission Management</h3>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                <div><p className="text-sm font-semibold">Two-Stage Approval</p><p className="text-xs text-muted-foreground mt-0.5">Faculty leave requests go to the HOD first. If approved, they escalate to the Principal for final sign-off.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                <div><p className="text-sm font-semibold">Student Leave Permissions</p><p className="text-xs text-muted-foreground mt-0.5">Add student leave permissions with date ranges, search and filter by name/year/section, and track leave history with highlighted dates.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                <div><p className="text-sm font-semibold">Broadcast Notifications</p><p className="text-xs text-muted-foreground mt-0.5">Use the Broadcast feature to send announcements. HODs can broadcast to their department; Principals can broadcast institution-wide.</p></div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="analytics" className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm space-y-4 animate-fade-in-up">
                        <h3 className="text-base font-bold text-primary">Data & Analytics</h3>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                <div><p className="text-sm font-semibold">Comparing Classes</p><p className="text-xs text-muted-foreground mt-0.5">Use the Compare module to graph and visualize attendance trends of multiple classes side-by-side.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                <div><p className="text-sm font-semibold">Reports & Export</p><p className="text-xs text-muted-foreground mt-0.5">Generate daily, weekly, or monthly cross-departmental reports and export them as neatly formatted Excel (.xlsx) files.</p></div>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                <div><p className="text-sm font-semibold">Compliance & Benchmarking</p><p className="text-xs text-muted-foreground mt-0.5">View defaulter lists based on institutional limits (75% standard, 65% detained). Compare department performance across the institution.</p></div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </section>

            {/* FAQ Section */}
            <section>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Frequently Asked Questions
                </h2>
                
                <div className="space-y-2">
                    {faqs.map((faq, i) => (
                        <div 
                            key={i} 
                            className="rounded-xl bg-card border border-border/50 overflow-hidden transition-all duration-200 hover:border-primary/20"
                        >
                            <button
                                onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                                className="w-full flex items-center justify-between px-5 py-4 text-left group"
                            >
                                <span className="text-sm font-medium text-foreground pr-4 group-hover:text-primary transition-colors">
                                    {faq.question}
                                </span>
                                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                                    openFAQ === i ? 'rotate-180 text-primary' : ''
                                }`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${
                                openFAQ === i ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                            }`}>
                                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Contact / Support Section */}
            <section>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Need Help?
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-amber-500/5 border border-primary/20 shadow-sm">
                        <Shield className="h-6 w-6 text-primary mb-3" />
                        <p className="text-sm font-semibold text-foreground">Report an Issue</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">Help us improve INSIGHT</p>
                        <a href="mailto:Purushottamraj2256@gmail.com" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                            Purushottamraj2256@gmail.com
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="text-center py-4">
                <p className="text-xs text-muted-foreground/60">
                    INSIGHT v1.0.0 — Built with ❤️ By PJ
                </p>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { 
    HelpCircle, MessageCircle, ChevronDown,
    Smartphone, Monitor, UserCheck, Calendar, BarChart3, ClipboardList,
    Mail, ExternalLink, Zap, Shield, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FAQItem {
    question: string;
    answer: string;
}

const faqs: FAQItem[] = [
    {
        question: "How do I take attendance using the INSIGHT app?",
        answer: "Open the INSIGHT mobile app → Select the appropriate class and period → The app will automatically scan for student beacons via BLE → Confirm the detected students and submit the attendance session. Students not detected can be manually marked."
    },
    {
        question: "What is BLE-based attendance and how does it work?",
        answer: "BLE (Bluetooth Low Energy) attendance uses beacon signals from student devices. When a faculty member initiates an attendance session, the app scans for nearby BLE beacons registered to students. Each student's device broadcasts a unique UUID that is matched against the database to mark presence."
    },
    {
        question: "How do I register new students?",
        answer: "Navigate to the Registration tab → Select 'Students' → Fill in the student details including name, roll number, department, section, and BLE UUID → Click 'Register'. You can also use the 'Bulk Import' feature to upload a CSV file of multiple students."
    },
    {
        question: "How does leave management work?",
        answer: "Faculty can submit leave requests through the mobile app. HODs and Principals can view pending requests in the Leave Manager tab → Review the request details → Accept or Decline with an optional comment. The faculty member receives a push notification on status change."
    },
    {
        question: "Can I compare attendance between different classes?",
        answer: "Yes! Use the Compare tab to select 2 or more classes, choose a time period (week/month/semester), and view side-by-side trend charts. You can switch between area, line, and bar chart visualizations."
    },
    {
        question: "How do I manage the timetable?",
        answer: "Go to the Timetable tab → Select a faculty member → View or edit their 6-day × 7-period grid → Click any cell to assign a subject → Save changes. You can also upload a timetable image for OCR-based auto-detection."
    },
    {
        question: "Who can access the dashboard?",
        answer: "Access is role-based: HODs can see their department data, Principals and Management can see all departments. Faculty members use only the mobile app. Developers and Admins have full access for testing and maintenance."
    },
    {
        question: "How is data secured?",
        answer: "All data is stored in Supabase with PostgreSQL, using Row-Level Security (RLS) policies. Authentication is handled via Supabase Auth. All API requests use encrypted HTTPS connections. User passwords are never stored in plain text."
    },
];

const features = [
    { icon: Smartphone, title: "Mobile App", desc: "BLE-based attendance via the INSIGHT mobile app" },
    { icon: Monitor, title: "Web Dashboard", desc: "Analytics, management, and administration" },
    { icon: UserCheck, title: "Registration", desc: "Student and faculty registration with bulk import" },
    { icon: Calendar, title: "Timetable", desc: "Drag-and-drop schedule management" },
    { icon: BarChart3, title: "Analytics", desc: "Detailed attendance trends and comparisons" },
    { icon: ClipboardList, title: "Leave Manager", desc: "Leave requests with push notifications" },
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
                        { step: '1', title: 'Register Students', desc: 'Add students with their BLE UUIDs via the Registration tab', color: 'from-primary to-amber-500' },
                        { step: '2', title: 'Set Up Timetable', desc: 'Configure faculty schedules in the Timetable manager', color: 'from-amber-500 to-orange-400' },
                        { step: '3', title: 'Take Attendance', desc: 'Use the mobile app to scan and record attendance', color: 'from-orange-400 to-red-400' },
                        { step: '4', title: 'Analyze & Report', desc: 'View trends, compare classes, and export reports', color: 'from-red-400 to-pink-500' },
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
                        <Mail className="h-6 w-6 text-primary mb-3" />
                        <p className="text-sm font-semibold text-foreground">Email Support</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">Get help within 24 hours</p>
                        <a href="mailto:support@insightapp.in" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                            support@insightapp.in
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                    <div className="p-5 rounded-xl bg-gradient-to-br from-primary/5 to-amber-500/5 border border-primary/20 shadow-sm">
                        <Shield className="h-6 w-6 text-primary mb-3" />
                        <p className="text-sm font-semibold text-foreground">Report an Issue</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-3">Help us improve INSIGHT</p>
                        <Button variant="outline" size="sm" className="rounded-lg gap-1 text-xs h-7">
                            <MessageCircle className="h-3 w-3" />
                            Submit Feedback
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div className="text-center py-4">
                <p className="text-xs text-muted-foreground/60">
                    INSIGHT v2.0.0 — Built with ❤️ for education
                </p>
            </div>
        </div>
    );
}

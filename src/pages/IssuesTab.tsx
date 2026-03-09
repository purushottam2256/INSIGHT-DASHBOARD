import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { sendNotification } from '@/lib/fcm';
import { 
    Bug, CheckCircle2, CircleDashed, 
    FileWarning, Trash2, Check,
    MessageSquare, AlertCircle, Clock,
    Image as ImageIcon, X, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Issue {
    id: string;
    user_id: string;
    description: string;
    has_screenshot: boolean;
    status: 'open' | 'investigating' | 'resolved';
    created_at: string;
    profiles?: {
        full_name: string;
        dept: string;
        role: string;
    };
}

export function IssuesTab({ isAdminRole }: { isAdminRole: boolean }) {
    const { user } = useAuth();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    
    // New Issue Form
    const [description, setDescription] = useState('');
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast.error('Image must be less than 2MB');
            return;
        }
        setScreenshotFile(file);
        const reader = new FileReader();
        reader.onload = () => setScreenshotPreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const fetchIssues = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            let query = supabase
                .from('issues')
                .select('*')
                .order('created_at', { ascending: false });

            // If not admin, only fetch their own issues
            if (!isAdminRole) {
                query = query.eq('user_id', user.id);
            }

            const { data: issuesData, error } = await query;
            if (error) {
                console.error("Supabase issues query error:", error);
                throw error;
            }

            let finalIssues = issuesData || [];

            // If we have issues, fetch the profiles manually to avoid foreign key relation errors
            if (finalIssues.length > 0) {
                const userIds = [...new Set(finalIssues.map(i => i.user_id))];
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name, dept, role')
                    .in('id', userIds);

                if (!profilesError && profilesData) {
                    const profileMap = profilesData.reduce((acc, p) => {
                        acc[p.id] = p;
                        return acc;
                    }, {} as any);
                    
                    finalIssues = finalIssues.map(i => ({
                        ...i,
                        profiles: profileMap[i.user_id] || { full_name: 'Unknown User', dept: 'N/A', role: 'user' }
                    }));
                } else if (profilesError) {
                    console.error("Error fetching profiles for issues:", profilesError);
                }
            }

            setIssues(finalIssues as any);
        } catch (err: any) {
            console.error("Error fetching issues:", err);
            toast.error(err.message || "Failed to load issues");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [user?.id, isAdminRole]);

    const handleSubmitIssue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !user?.id) return;
        
        setIsSubmitting(true);
        try {
            // First insert the issue
            const { data, error } = await supabase.from('issues').insert([{
                user_id: user.id,
                description: description.trim(),
                has_screenshot: !!screenshotFile,
                status: 'open'
            }]).select('id');

            if (error) throw error;
            
            const newIssueId = data?.[0]?.id;

            // Then upload the screenshot if it exists
            if (screenshotFile && newIssueId) {
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(`issues/${newIssueId}`, screenshotFile);
                    
                if (uploadError) {
                    console.error("Screenshot upload failed:", uploadError);
                    toast.error("Issue created, but screenshot upload failed.");
                }
            }
            
            toast.success("Issue submitted successfully. Our team will look into it.");
            setDescription('');
            setScreenshotFile(null);
            setScreenshotPreview(null);
            fetchIssues();
        } catch (err: any) {
            toast.error(err.message || "Failed to submit issue");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStatus = async (issue: Issue, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('issues')
                .update({ status: newStatus })
                .eq('id', issue.id);

            if (error) throw error;
            toast.success(`Issue marked as ${newStatus}`);
            setIssues(issues.map(i => i.id === issue.id ? { ...i, status: newStatus as any } : i));

            // Send FCM Notification if resolved
            if (newStatus === 'resolved' && issue.user_id) {
                await sendNotification([issue.user_id], {
                    title: 'Issue Resolved ✅',
                    body: `The development team has resolved your report: "${issue.description.substring(0, 40)}..."`,
                    type: 'issue_resolution',
                    priority: 'high'
                });
            }
        } catch (err: any) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this issue?")) return;
        try {
            const { error } = await supabase.from('issues').delete().eq('id', id);
            if (error) throw error;
            toast.success("Issue deleted");
            setIssues(issues.filter(i => i.id !== id));
        } catch (err: any) {
            toast.error("Failed to delete issue");
        }
    };

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'open': return <AlertCircle className="w-4 h-4 text-orange-500" />;
            case 'investigating': return <Clock className="w-4 h-4 text-blue-500" />;
            case 'resolved': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            default: return <CircleDashed className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'open': return "bg-orange-500/10 text-orange-600 border border-orange-500/20";
            case 'investigating': return "bg-blue-500/10 text-blue-600 border border-blue-500/20";
            case 'resolved': return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
            default: return "bg-gray-500/10 text-gray-600 border border-gray-500/20";
        }
    };

    return (
        <div className="space-y-8 animate-fade-in relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="flex items-center gap-4 mb-2">
                <div className="p-4 rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
                    <Bug className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <div>
                    <h3 className="text-2xl font-extrabold text-foreground">Issues & Support</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isAdminRole ? "Manage and resolve platform feedback from all users." : "Report bugs or request features to the development team."}
                    </p>
                </div>
            </div>

            {/* New Issue Form */}
            <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-[2rem] p-6 sm:p-8 shadow-sm">
                <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" /> Submit a New Report
                </h4>
                <form onSubmit={handleSubmitIssue} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Description</label>
                        <Textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the issue or feature request in detail..."
                            className="min-h-[120px] rounded-2xl resize-none bg-background focus-visible:ring-primary/50"
                            required
                        />
                    </div>
                    <div className="flex justify-between items-center sm:items-end">
                        <div className="flex flex-col gap-2 max-w-[60%]">
                            <p className="text-xs text-muted-foreground mr-4">
                                Please provide enough detail so our team can easily investigate the query.
                            </p>
                            
                            {/* Upload Screenshot preview or button */}
                            {screenshotPreview ? (
                                <div className="relative inline-block mt-2">
                                    <img src={screenshotPreview} alt="Screenshot preview" className="h-20 w-auto rounded-xl object-cover border border-border/50 shadow-sm" />
                                    <button 
                                        type="button" 
                                        onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:scale-110 transition-transform"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    <input 
                                        type="file" 
                                        id="screenshot-upload" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleFileChange}
                                    />
                                    <label 
                                        htmlFor="screenshot-upload" 
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                                    >
                                        <ImageIcon className="w-3.5 h-3.5" /> Attach Screenshot
                                    </label>
                                </div>
                            )}
                        </div>
                        <Button 
                            type="submit" 
                            disabled={isSubmitting || !description.trim()}
                            className="rounded-2xl px-6 sm:px-8 h-12 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 shrink-0"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {isSubmitting ? "Submitting..." : "Submit Report"}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Existing Issues */}
            <div className="space-y-4">
                <h4 className="text-lg font-bold flex items-center gap-2 pl-2">
                    <FileWarning className="w-5 h-5 text-primary" /> {isAdminRole ? "Global Reports Map" : "My Submitted Reports"}
                </h4>
                
                {loading ? (
                    <div className="p-12 text-center text-muted-foreground bg-card/50 rounded-[2rem] border border-border/50">
                        <Bug className="h-8 w-8 animate-pulse mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Loading reports database...</p>
                    </div>
                ) : issues.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground bg-card/50 backdrop-blur-xl border-dashed border-2 border-border/60 rounded-[2rem]">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500/40 mx-auto mb-3" />
                        <p className="font-medium text-foreground">Zero Anomolies Detected</p>
                        <p className="text-sm mt-1">There are no reports currently logged in the system.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {issues.map(issue => (
                            <div key={issue.id} className="bg-card border border-border/50 rounded-3xl p-5 hover:border-primary/30 transition-all duration-300 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                                <div className="flex-1 space-y-2 min-w-0 w-full">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", getStatusBadge(issue.status))}>
                                            {getStatusIcon(issue.status)} {issue.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {format(new Date(issue.created_at), 'MMM dd, yyyy - hh:mm a')}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                                        {issue.description}
                                    </p>
                                    
                                    {issue.has_screenshot && (
                                        <div className="mt-3">
                                            <a 
                                                href={supabase.storage.from('avatars').getPublicUrl(`issues/${issue.id}`).data.publicUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-block relative group"
                                            >
                                                <img 
                                                    src={supabase.storage.from('avatars').getPublicUrl(`issues/${issue.id}`).data.publicUrl} 
                                                    alt="Issue screenshot" 
                                                    className="max-h-32 w-auto rounded-xl object-cover border border-border/50 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]" 
                                                />
                                            </a>
                                        </div>
                                    )}
                                    
                                    {isAdminRole && issue.profiles && (
                                        <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 mt-3 !pt-3">
                                            <span className="font-bold text-foreground">{issue.profiles.full_name}</span>
                                            <span>•</span>
                                            <span className="uppercase tracking-wider">{issue.profiles.dept}</span>
                                            <span>•</span>
                                            <span className="capitalize">{issue.profiles.role}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {isAdminRole && (
                                    <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                                        {issue.status !== 'investigating' && (
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleUpdateStatus(issue, 'investigating')}
                                                className="rounded-xl flex-1 md:flex-none border-blue-500/20 text-blue-600 hover:bg-blue-50"
                                            >
                                                <Clock className="w-4 h-4 mr-1.5" /> Investigate
                                            </Button>
                                        )}
                                        {issue.status !== 'resolved' && (
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => handleUpdateStatus(issue, 'resolved')}
                                                className="rounded-xl flex-1 md:flex-none border-emerald-500/20 text-emerald-600 hover:bg-emerald-50"
                                            >
                                                <Check className="w-4 h-4 mr-1.5" /> Resolve
                                            </Button>
                                        )}
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => handleDelete(issue.id)}
                                            className="rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            title="Delete Issue"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

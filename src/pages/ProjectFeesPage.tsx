import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Download, Trash2, Edit3, ChevronDown, ChevronUp,
  IndianRupee, Calendar, AlertTriangle, CheckCircle2, Clock, X,
  Users, FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { DEPARTMENTS, SECTIONS } from '@/lib/constants';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────
interface ProjectFee {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  due_date: string;
  dept: string | null;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface FeeClass {
  id: string;
  fee_id: string;
  dept: string;
  year: number;
  section: string;
}

interface FeeStudent {
  id: string;
  fee_id: string;
  student_id: string;
  status: 'paid' | 'due';
  reason: string | null;
  updated_at: string;
  // Joined fields
  roll_no?: string;
  full_name?: string;
  dept?: string;
  year?: number;
  section?: string;
}

interface ClassOption {
  dept: string;
  year: number;
  section: string;
  label: string;
}

type StatusFilter = 'all' | 'complete' | 'incomplete' | 'overdue';

// ── Component ──────────────────────────────────────────────────────────────
export default function ProjectFeesPage() {
  const permissions = usePermissions();

  // Data state
  const [fees, setFees] = useState<ProjectFee[]>([]);
  const [feeClasses, setFeeClasses] = useState<Record<string, FeeClass[]>>({});
  const [feeStudentCounts, setFeeStudentCounts] = useState<Record<string, { total: number; paid: number }>>({});
  const [loading, setLoading] = useState(true);

  // UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<FeeStudent[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ status: 'paid' | 'due'; reason: string }>({ status: 'due', reason: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [rosterClassFilter, setRosterClassFilter] = useState<string>('all');

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formClasses, setFormClasses] = useState<ClassOption[]>([]);
  const [creating, setCreating] = useState(false);

  // ── Fetch Data ────────────────────────────────────────────────────────
  const fetchFees = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('project_fees').select('*').order('created_at', { ascending: false });
      if (permissions.isDeptScoped && permissions.userDept) {
        query = query.eq('dept', permissions.userDept);
      }
      const { data, error } = await query;
      if (error) throw error;
      setFees((data as ProjectFee[]) || []);

      // Fetch classes for all fees
      if (data && data.length > 0) {
        const feeIds = data.map((f: ProjectFee) => f.id);
        const { data: classData } = await supabase
          .from('project_fee_classes')
          .select('*')
          .in('fee_id', feeIds);

        const classMap: Record<string, FeeClass[]> = {};
        (classData || []).forEach((c: FeeClass) => {
          if (!classMap[c.fee_id]) classMap[c.fee_id] = [];
          classMap[c.fee_id].push(c);
        });
        setFeeClasses(classMap);

        // Fetch student counts per fee
        const countMap: Record<string, { total: number; paid: number }> = {};
        for (const feeId of feeIds) {
          const { count: totalCount } = await supabase
            .from('project_fee_students')
            .select('*', { count: 'exact', head: true })
            .eq('fee_id', feeId);
          const { count: paidCount } = await supabase
            .from('project_fee_students')
            .select('*', { count: 'exact', head: true })
            .eq('fee_id', feeId)
            .eq('status', 'paid');
          countMap[feeId] = { total: totalCount || 0, paid: paidCount || 0 };
        }
        setFeeStudentCounts(countMap);
      }
    } catch (err: any) {
      toast.error('Failed to load project fees: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [permissions.isDeptScoped, permissions.userDept]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  // ── Expand Fee → Load Student Roster ──────────────────────────────────
  const toggleExpand = async (feeId: string) => {
    if (expandedFeeId === feeId) {
      setExpandedFeeId(null);
      setExpandedStudents([]);
      return;
    }
    setExpandedFeeId(feeId);
    setExpandedLoading(true);
    setRosterClassFilter('all');
    try {
      const { data, error } = await supabase
        .from('project_fee_students')
        .select(`
          id, fee_id, student_id, status, reason, updated_at,
          students!inner(roll_no, full_name, dept, year, section)
        `)
        .eq('fee_id', feeId)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped: FeeStudent[] = (data || []).map((row: any) => ({
        id: row.id,
        fee_id: row.fee_id,
        student_id: row.student_id,
        status: row.status,
        reason: row.reason,
        updated_at: row.updated_at,
        roll_no: row.students?.roll_no,
        full_name: row.students?.full_name,
        dept: row.students?.dept,
        year: row.students?.year,
        section: row.students?.section,
      }));
      setExpandedStudents(mapped);
    } catch (err: any) {
      toast.error('Failed to load student roster: ' + err.message);
    } finally {
      setExpandedLoading(false);
    }
  };

  // ── Create Fee Project ────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!formTitle.trim()) { toast.error('Title is required'); return; }
    if (!formAmount || parseFloat(formAmount) <= 0) { toast.error('Valid amount is required'); return; }
    if (!formDueDate) { toast.error('Due date is required'); return; }
    if (formClasses.length === 0) { toast.error('Select at least one class'); return; }

    setCreating(true);
    try {
      const dept = permissions.isDeptScoped ? permissions.userDept : formClasses[0]?.dept || null;
      const { data: feeData, error: feeError } = await supabase
        .from('project_fees')
        .insert({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          amount: parseFloat(formAmount),
          due_date: formDueDate,
          dept,
          is_complete: false,
        })
        .select()
        .single();

      if (feeError) throw feeError;
      const feeId = feeData.id;

      // Insert targeted classes
      const classRows = formClasses.map(c => ({
        fee_id: feeId,
        dept: c.dept,
        year: c.year,
        section: c.section,
      }));
      const { error: classError } = await supabase.from('project_fee_classes').insert(classRows);
      if (classError) throw classError;

      // Fetch students for these classes and insert fee_students
      for (const cls of formClasses) {
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('dept', cls.dept)
          .eq('year', cls.year)
          .eq('section', cls.section)
          .eq('is_active', true);

        if (students && students.length > 0) {
          const studentRows = students.map((s: any) => ({
            fee_id: feeId,
            student_id: s.id,
            status: 'due',
          }));
          await supabase.from('project_fee_students').insert(studentRows);
        }
      }

      toast.success('Project fee created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchFees();
    } catch (err: any) {
      toast.error('Failed to create project fee: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Delete Fee ────────────────────────────────────────────────────────
  const handleDelete = async (feeId: string) => {
    try {
      const { error } = await supabase.from('project_fees').delete().eq('id', feeId);
      if (error) throw error;
      toast.success('Project fee deleted');
      setDeleteConfirm(null);
      if (expandedFeeId === feeId) {
        setExpandedFeeId(null);
        setExpandedStudents([]);
      }
      fetchFees();
    } catch (err: any) {
      toast.error('Failed to delete: ' + err.message);
    }
  };

  // ── Update Student Status ─────────────────────────────────────────────
  const handleUpdateStudent = async (studentRowId: string) => {
    try {
      const { error } = await supabase
        .from('project_fee_students')
        .update({
          status: editForm.status,
          reason: editForm.reason.trim() || null,
        })
        .eq('id', studentRowId);

      if (error) throw error;
      toast.success('Student payment updated');
      setEditingStudentId(null);

      // Refresh expanded roster
      if (expandedFeeId) toggleExpand(expandedFeeId);
      fetchFees();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormAmount('');
    setFormDueDate('');
    setFormClasses([]);
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date() ;
  const today = new Date().toISOString().split('T')[0];

  const getStatusInfo = (fee: ProjectFee) => {
    const counts = feeStudentCounts[fee.id] || { total: 0, paid: 0 };
    if (fee.is_complete || (counts.total > 0 && counts.paid === counts.total)) {
      return { label: 'Complete', color: 'emerald', icon: CheckCircle2 };
    }
    if (isOverdue(fee.due_date)) {
      return { label: 'Overdue', color: 'red', icon: AlertTriangle };
    }
    return { label: 'Incomplete', color: 'amber', icon: Clock };
  };

  const toggleClass = (cls: ClassOption) => {
    setFormClasses(prev => {
      const exists = prev.find(c => c.dept === cls.dept && c.year === cls.year && c.section === cls.section);
      if (exists) return prev.filter(c => !(c.dept === cls.dept && c.year === cls.year && c.section === cls.section));
      return [...prev, cls];
    });
  };

  // ── Filtered Fees ─────────────────────────────────────────────────────
  const filteredFees = useMemo(() => {
    let result = fees;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.title.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(f => {
        const info = getStatusInfo(f);
        if (statusFilter === 'complete') return info.label === 'Complete';
        if (statusFilter === 'incomplete') return info.label === 'Incomplete';
        if (statusFilter === 'overdue') return info.label === 'Overdue';
        return true;
      });
    }
    return result;
  }, [fees, searchQuery, statusFilter, feeStudentCounts]);

  // ── Institutional Stats ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const activeFees = fees.length;
    let totalExpected = 0;
    let totalCollected = 0;
    let overdueCount = 0;
    let completeCount = 0;

    fees.forEach(f => {
      const counts = feeStudentCounts[f.id] || { total: 0, paid: 0 };
      totalExpected += counts.total * f.amount;
      totalCollected += counts.paid * f.amount;
      if (getStatusInfo(f).label === 'Overdue') overdueCount++;
      if (getStatusInfo(f).label === 'Complete') completeCount++;
    });

    return {
      activeFees,
      totalExpected,
      totalCollected,
      overdueCount,
      completionRate: activeFees > 0 ? Math.round((completeCount / activeFees) * 100) : 0,
    };
  }, [fees, feeStudentCounts]);

  // ── Export CSV ────────────────────────────────────────────────────────
  const exportRosterCSV = (fee: ProjectFee) => {
    if (expandedStudents.length === 0) return;
    let csv = 'Roll No,Name,Class,Amount (₹),Status,Reason\n';
    expandedStudents.forEach(s => {
      csv += `${s.roll_no || ''},${s.full_name || ''},${s.year}-${(s.dept || '').toUpperCase()}-${s.section || ''},${fee.amount},${s.status},${(s.reason || '').replace(/,/g, ';')}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fee.title.replace(/\s+/g, '_')}_roster_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSummaryCSV = () => {
    let csv = 'Title,Amount (₹),Due Date,Total Students,Paid,Due,Status\n';
    fees.forEach(f => {
      const counts = feeStudentCounts[f.id] || { total: 0, paid: 0 };
      const info = getStatusInfo(f);
      csv += `${f.title},${f.amount},${f.due_date},${counts.total},${counts.paid},${counts.total - counts.paid},${info.label}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project_fees_summary_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Institutional Summary Bar ── */}
      <div className="p-5 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-amber-500/5 to-emerald-500/5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <IndianRupee className="h-4 w-4" />
            Fee Collection Overview
          </h3>
          <button
            onClick={exportSummaryCSV}
            disabled={fees.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export Summary
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <div className="text-2xl font-bold text-foreground">{stats.activeFees}</div>
            <div className="text-xs text-muted-foreground">Active Projects</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">₹{stats.totalExpected.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Expected</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">₹{stats.totalCollected.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Collected</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{stats.overdueCount}</div>
            <div className="text-xs text-muted-foreground">Overdue Projects</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">{stats.completionRate}%</div>
            <div className="text-xs text-muted-foreground">Completion Rate</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar: Search + Filter + Create ── */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fee projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl">
          {(['all', 'incomplete', 'overdue', 'complete'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === f
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Fee
        </button>
      </div>

      {/* ── Fee Cards Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredFees.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <IndianRupee className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground text-sm">
            {fees.length === 0 ? 'No fee projects yet. Create one to get started!' : 'No matching fee projects found.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFees.map(fee => {
            const counts = feeStudentCounts[fee.id] || { total: 0, paid: 0 };
            const statusInfo = getStatusInfo(fee);
            const StatusIcon = statusInfo.icon;
            const progress = counts.total > 0 ? Math.round((counts.paid / counts.total) * 100) : 0;
            const isExpanded = expandedFeeId === fee.id;
            const classes = feeClasses[fee.id] || [];

            return (
              <motion.div
                key={fee.id}
                layout
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div
                  className="p-5 cursor-pointer group"
                  onClick={() => toggleExpand(fee.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="text-base font-bold text-foreground truncate">{fee.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${statusInfo.color}-500/10 text-${statusInfo.color}-600 border border-${statusInfo.color}-500/20`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      {fee.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{fee.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          ₹{fee.amount.toLocaleString()} per student
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(fee.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {counts.paid}/{counts.total} paid
                        </span>
                        {classes.length > 0 && (
                          <span className="flex items-center gap-1 flex-wrap">
                            <FileText className="h-3 w-3 shrink-0" />
                            {classes.map(c => `${c.year}-${c.dept}-${c.section}`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {deleteConfirm === fee.id ? (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(fee.id); }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(fee.id); }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete project fee"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <div className="p-2 rounded-lg text-muted-foreground">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1">
                      <span>Collection Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          progress === 100 ? 'bg-emerald-500' :
                          progress > 50 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Roster */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border">
                        <div className="px-5 py-3 bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm font-bold text-foreground">Student Roster</span>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {expandedStudents.length} students
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={rosterClassFilter}
                              onChange={(e) => setRosterClassFilter(e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold focus:ring-1 focus:ring-primary/30"
                            >
                              <option value="all">All Classes</option>
                              {[...new Set(expandedStudents.map(s => `${s.year}-${(s.dept || '').toUpperCase()}-${s.section}`))].sort().map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                              ))}
                            </select>
                            <span className="text-[10px] text-muted-foreground italic hidden sm:block">
                              ✏️ Editable by Class Incharges via Attend-Me app
                            </span>
                            <button
                              onClick={() => exportRosterCSV(fee)}
                              disabled={expandedStudents.length === 0}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {expandedLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : expandedStudents.length === 0 ? (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            No students found for this project fee.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                  <th className="text-left px-4 py-3 font-semibold">#</th>
                                  <th className="text-left px-4 py-3 font-semibold">Roll No</th>
                                  <th className="text-left px-4 py-3 font-semibold">Name</th>
                                  <th className="text-center px-4 py-3 font-semibold">Class</th>
                                  <th className="text-center px-4 py-3 font-semibold">Amount (₹)</th>
                                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                                  <th className="text-left px-4 py-3 font-semibold">Reason</th>
                                  <th className="text-center px-4 py-3 font-semibold">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {expandedStudents
                                  .filter(s => rosterClassFilter === 'all' || `${s.year}-${(s.dept || '').toUpperCase()}-${s.section}` === rosterClassFilter)
                                  .map((s, i) => (
                                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{s.roll_no || '—'}</td>
                                    <td className="px-4 py-3 font-medium">{s.full_name || '—'}</td>
                                    <td className="px-4 py-3 text-center text-xs font-medium">{s.year}-{(s.dept || '').toUpperCase()}-{s.section}</td>
                                    <td className="px-4 py-3 text-center font-semibold">₹{fee.amount.toLocaleString()}</td>

                                    {editingStudentId === s.id ? (
                                      <>
                                        <td className="px-4 py-3 text-center">
                                          <select
                                            value={editForm.status}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'paid' | 'due' }))}
                                            className="px-2 py-1 rounded-lg border border-border bg-card text-xs font-semibold"
                                          >
                                            <option value="due">Due</option>
                                            <option value="paid">Paid</option>
                                          </select>
                                        </td>
                                        <td className="px-4 py-3">
                                          <input
                                            type="text"
                                            value={editForm.reason}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                                            placeholder="Issue description..."
                                            className="w-full px-2 py-1 rounded-lg border border-border bg-card text-xs"
                                          />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                            <button
                                              onClick={() => handleUpdateStudent(s.id)}
                                              className="px-2 py-1 text-[10px] font-bold bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={() => setEditingStudentId(null)}
                                              className="px-2 py-1 text-[10px] font-bold bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </td>
                                      </>
                                    ) : (
                                      <>
                                        <td className="px-4 py-3 text-center">
                                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            s.status === 'paid'
                                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                          }`}>
                                            {s.status === 'paid' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                            {s.status}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                                          {s.reason || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                          <button
                                            onClick={() => {
                                              setEditingStudentId(s.id);
                                              setEditForm({ status: s.status, reason: s.reason || '' });
                                            }}
                                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                            title="Edit payment status"
                                          >
                                            <Edit3 className="h-3.5 w-3.5" />
                                          </button>
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Create Fee Modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowCreateModal(false); resetForm(); }}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-foreground">Create Project Fee</h2>
                    <button
                      onClick={() => { setShowCreateModal(false); resetForm(); }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Title *</label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Lab Equipment Fee"
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Brief description of the fee..."
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      />
                    </div>

                    {/* Amount + Due Date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Amount (₹) *</label>
                        <input
                          type="number"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          placeholder="500"
                          min="1"
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-semibold focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Due Date *</label>
                        <input
                          type="date"
                          value={formDueDate}
                          onChange={(e) => setFormDueDate(e.target.value)}
                          min={today}
                          className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                        />
                      </div>
                    </div>

                    {/* Class Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        Select Classes * <span className="text-primary">({formClasses.length} selected)</span>
                      </label>
                      <div className="border border-border rounded-xl p-3 max-h-[200px] overflow-y-auto bg-background/50 space-y-2">
                        {DEPARTMENTS.filter(d => !permissions.isDeptScoped || d.value === permissions.userDept).map(dept => (
                          <div key={dept.value}>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{dept.label}</p>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              {[1, 2, 3, 4].map(year => (
                                (dept.value === 'cse' ? SECTIONS : SECTIONS.filter(s => ['A', 'B', 'C'].includes(s))).map(sec => {
                                  const cls: ClassOption = { dept: dept.value, year, section: sec, label: `${year}-${dept.value}-${sec}` };
                                  const isSelected = formClasses.some(c => c.dept === cls.dept && c.year === cls.year && c.section === cls.section);
                                  return (
                                    <button
                                      key={cls.label}
                                      type="button"
                                      onClick={() => toggleClass(cls)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                        isSelected
                                          ? 'bg-primary text-white shadow-sm'
                                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                                      }`}
                                    >
                                      {cls.label}
                                    </button>
                                  );
                                })
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                    <button
                      onClick={() => { setShowCreateModal(false); resetForm(); }}
                      className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                    >
                      {creating ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {creating ? 'Creating...' : 'Create Fee'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

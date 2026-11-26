import {
  CalendarDays,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { derivePrivateClassCode } from '../data/studentPortalData';
import type {
  ClassAssignment,
  ClassMaterial,
  ClassScheduleSlot,
  SubjectId,
  TeacherPrivateClass,
  UserAccount,
} from '../types/exam';
import {
  localizeGradeText,
  localizeSubjectName,
  useLanguage,
} from '../utils/i18n';
import {
  canTeacherEditResource,
  formatGradeLabel,
  getSubjectMeta,
} from '../utils/scoring2025';
import { WeeklyCalendarSchedule } from './WeeklyCalendarSchedule';

interface TeacherClassContentModalProps {
  targetClass: TeacherPrivateClass;
  currentUser: UserAccount;
  materials: ClassMaterial[];
  assignments: ClassAssignment[];
  schedules: ClassScheduleSlot[];
  onAddMaterial: (material: ClassMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onAddAssignment: (assignment: ClassAssignment) => void;
  onDeleteAssignment: (id: string) => void;
  onAddScheduleSlot: (slot: ClassScheduleSlot) => void;
  onUpdateScheduleSlot: (slot: ClassScheduleSlot) => void;
  onDeleteScheduleSlot: (id: string) => void;
  onClose: () => void;
}

type ModalTab = 'materials' | 'assignments' | 'schedule';

export function TeacherClassContentModal({
  targetClass,
  currentUser,
  materials,
  assignments,
  schedules,
  onAddMaterial,
  onDeleteMaterial,
  onAddAssignment,
  onDeleteAssignment,
  onAddScheduleSlot,
  onUpdateScheduleSlot,
  onDeleteScheduleSlot,
  onClose,
}: TeacherClassContentModalProps) {
  const { language, tx } = useLanguage();
  const [activeTab, setActiveTab] = useState<ModalTab>('materials');
  const canEdit = canTeacherEditResource(targetClass, currentUser);
  const classCode = derivePrivateClassCode(targetClass);
  const defaultSubject: SubjectId = targetClass.subject ?? currentUser.subject ?? 'toan';

  // Material Form State
  const [matTitle, setMatTitle] = useState('');
  const [matCategory, setMatCategory] = useState('');
  const [matSummary, setMatSummary] = useState('');
  const [matContent, setMatContent] = useState('');
  const [matAttachmentName, setMatAttachmentName] = useState<string | undefined>(
    undefined,
  );
  const [matError, setMatError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Assignment Form State
  const [asgTitle, setAsgTitle] = useState('');
  const [asgDue, setAsgDue] = useState('');
  const [asgMinutes, setAsgMinutes] = useState(20);
  const [asgDesc, setAsgDesc] = useState('');
  const [asgRoomCode, setAsgRoomCode] = useState('');
  const [asgError, setAsgError] = useState<string | null>(null);

  const classMaterials = materials.filter((m) => m.classId === targetClass.id);
  const classAssignments = assignments.filter((a) => a.classId === targetClass.id);
  const classSchedules = schedules.filter((s) => s.classId === targetClass.id);

  const handleMaterialFileRead = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMatAttachmentName(file.name);
    if (!matTitle.trim()) {
      setMatTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    try {
      const text = await file.text();
      if (text.trim()) {
        setMatContent(text.slice(0, 12000));
      }
    } catch {
      setMatContent(tx(`Tệp đính kèm từ giáo viên: ${file.name}`, `Attached file from teacher: ${file.name}`));
    }
  };

  const handleAddMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matTitle.trim().length < 2) {
      setMatError(tx('Vui lòng nhập tiêu đề tài liệu.', 'Please enter a material title.'));
      return;
    }
    onAddMaterial({
      id: `cmat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      classId: targetClass.id,
      title: matTitle.trim(),
      subject: defaultSubject,
      grade: targetClass.grade,
      category: matCategory.trim() || tx('Tài liệu lớp học', 'Class Material'),
      summary:
        matSummary.trim() ||
        tx(
          `Tài liệu do ${currentUser.fullName} gửi cho lớp ${targetClass.name}.`,
          `Material shared by ${currentUser.fullName} for class ${targetClass.name}.`,
        ),
      keyPoints: [],
      contentText:
        matContent.trim() ||
        `${matTitle.trim()}\n${tx('Giáo viên', 'Teacher')}: ${currentUser.fullName}\n${tx('Lớp', 'Class')}: ${classCode}`,
      attachmentName: matAttachmentName,
      ownerTeacherId: currentUser.id,
      ownerTeacherName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    });
    setMatTitle('');
    setMatSummary('');
    setMatContent('');
    setMatAttachmentName(undefined);
    setMatError(null);
  };

  const handleAddAssignmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (asgTitle.trim().length < 2) {
      setAsgError(tx('Vui lòng nhập tên bài tập.', 'Please enter an assignment title.'));
      return;
    }
    onAddAssignment({
      id: `casg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      classId: targetClass.id,
      title: asgTitle.trim(),
      subject: defaultSubject,
      grade: targetClass.grade,
      description:
        asgDesc.trim() ||
        tx(
          `Bài tập rèn luyện do ${currentUser.fullName} giao trong lớp ${classCode}.`,
          `Practice assignment given by ${currentUser.fullName} in class ${classCode}.`,
        ),
      dueDateLabel: asgDue.trim() || tx('Cuối tuần', 'End of week'),
      estimatedMinutes: Math.max(5, Number(asgMinutes) || 15),
      relatedRoomCode: asgRoomCode.trim().toUpperCase() || undefined,
      ownerTeacherId: currentUser.id,
      ownerTeacherName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    });
    setAsgTitle('');
    setAsgDesc('');
    setAsgRoomCode('');
    setAsgError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tx(`Quản lý lớp học ${targetClass.name}`, `Manage class ${targetClass.name}`)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs dark:bg-slate-950/80"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              {localizeSubjectName(defaultSubject, getSubjectMeta(defaultSubject).name, language)} ·{' '}
              {localizeGradeText(formatGradeLabel(targetClass.grade), language)} ·{' '}
              {tx('Mã lớp', 'Class code')}:{' '}
              <span className="font-mono">{classCode}</span>
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-slate-50">
              {tx('Quản lý lớp học', 'Manage class')}: {targetClass.name}
            </h2>
          </div>

          <button
            type="button"
            aria-label={tx('Đóng quản lý lớp học', 'Close class management')}
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-6 py-3 dark:border-slate-800 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold tabular-nums transition-colors ${
              activeTab === 'materials'
                ? 'bg-blue-700 text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>{tx('Tài liệu lớp', 'Materials')} ({classMaterials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold tabular-nums transition-colors ${
              activeTab === 'assignments'
                ? 'bg-blue-700 text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            <span>{tx('Bài tập giao', 'Assignments')} ({classAssignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold tabular-nums transition-colors ${
              activeTab === 'schedule'
                ? 'bg-blue-700 text-white dark:bg-blue-600'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{tx('Lịch học Thứ 2 – Chủ nhật', 'Mon – Sun Schedule')} ({classSchedules.length})</span>
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {!canEdit && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
              {tx('Lớp học này được', 'This class was shared with you by')}{' '}
              <strong>{targetClass.ownerTeacherName}</strong>{' '}
              {tx('chia sẻ cho bạn ở chế độ', 'in')}{' '}
              <strong>{tx('Chỉ xem', 'View-only')}</strong>{' '}
              {tx(
                '. Bạn có thể xem tài liệu, bài tập và lịch học nhưng không thể chỉnh sửa hoặc xóa.',
                'mode. You can view materials, assignments, and schedules but cannot edit or delete.',
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-6">
              {canEdit && (
              <form
                onSubmit={handleAddMaterialSubmit}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                    {tx('Gửi tài liệu mới cho học sinh trong lớp', 'Send new material to students in class')}
                  </h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv"
                    onChange={handleMaterialFileRead}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{tx('Chọn file văn bản (.txt/.md)', 'Choose text file (.txt/.md)')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tx('Tiêu đề tài liệu', 'Material title')}
                    </label>
                    <input
                      type="text"
                      value={matTitle}
                      onChange={(e) => {
                        setMatTitle(e.target.value);
                        if (matError) setMatError(null);
                      }}
                      placeholder={tx('VD: Đề cương ôn tập Chương 1...', 'e.g., Chapter 1 Study Guide...')}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tx('Phân loại', 'Category')}
                    </label>
                    <input
                      type="text"
                      value={matCategory}
                      onChange={(e) => setMatCategory(e.target.value)}
                      placeholder={tx('Tài liệu ôn tập', 'Study material')}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tx('Mô tả ngắn', 'Short summary')}
                  </label>
                  <input
                    type="text"
                    value={matSummary}
                    onChange={(e) => setMatSummary(e.target.value)}
                    placeholder={tx('Tóm tắt nội dung chính của tài liệu...', 'Brief summary of the material...')}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tx('Nội dung chi tiết', 'Detailed content')} {matAttachmentName ? `(${matAttachmentName})` : ''}
                  </label>
                  <textarea
                    rows={3}
                    value={matContent}
                    onChange={(e) => setMatContent(e.target.value)}
                    placeholder={tx(
                      'Nhập nội dung tóm tắt, công thức hoặc ghi chú gửi học sinh...',
                      'Enter summary notes, formulas, or instructions for students...',
                    )}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                {matError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    {matError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{tx('Gửi tài liệu vào lớp', 'Send material to class')}</span>
                  </button>
                </div>
              </form>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {classMaterials.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {tx('Lớp học chưa có tài liệu nào.', 'This class has no materials yet.')}
                  </p>
                ) : (
                  classMaterials.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                          {mat.category}
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {mat.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                          {mat.summary}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onDeleteMaterial(mat.id)}
                          aria-label={tx(`Xóa tài liệu ${mat.title}`, `Delete material ${mat.title}`)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-6">
              {canEdit && (
              <form
                onSubmit={handleAddAssignmentSubmit}
                className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                  {tx('Giao bài tập mới cho lớp học', 'Assign new homework to class')}
                </h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tx('Tên bài tập', 'Assignment title')}
                    </label>
                    <input
                      type="text"
                      value={asgTitle}
                      onChange={(e) => {
                        setAsgTitle(e.target.value);
                        if (asgError) setAsgError(null);
                      }}
                      placeholder={tx('VD: Bài tập tuần 3 — Ứng dụng Tích phân', 'e.g., Week 3 Practice — Integral Applications')}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tx('Hạn hoàn thành', 'Due date')}
                    </label>
                    <input
                      type="text"
                      value={asgDue}
                      onChange={(e) => setAsgDue(e.target.value)}
                      placeholder={tx('Thứ 6 · 21:00', 'Fri · 21:00')}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tx('Hướng dẫn / Yêu cầu bài tập', 'Instructions / Requirements')}
                    </label>
                    <input
                      type="text"
                      value={asgDesc}
                      onChange={(e) => setAsgDesc(e.target.value)}
                      placeholder={tx('Nội dung kiến thức cần luyện tập...', 'Topics or exercises to practice...')}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tx('Thời lượng dự kiến (phút)', 'Estimated time (min)')}
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={asgMinutes}
                      onChange={(e) => setAsgMinutes(Number(e.target.value))}
                      className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {asgError && (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">
                    {asgError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{tx('Giao bài tập vào lớp', 'Assign to class')}</span>
                  </button>
                </div>
              </form>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {classAssignments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {tx('Lớp học chưa có bài tập nào.', 'This class has no assignments yet.')}
                  </p>
                ) : (
                  classAssignments.map((asg) => (
                    <div
                      key={asg.id}
                      className="flex items-start justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tx('Hạn', 'Due')}: {asg.dueDateLabel} · {asg.estimatedMinutes} {tx('phút', 'min')}
                        </p>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {asg.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                          {asg.description}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onDeleteAssignment(asg.id)}
                          aria-label={tx(`Xóa bài tập ${asg.title}`, `Delete assignment ${asg.title}`)}
                          className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <WeeklyCalendarSchedule
              slots={classSchedules}
              classes={[targetClass]}
              canEdit={canEdit}
              currentUser={currentUser}
              onAddSlot={onAddScheduleSlot}
              onUpdateSlot={onUpdateScheduleSlot}
              onDeleteSlot={onDeleteScheduleSlot}
              emptyNotice={tx(
                'Lớp học này chưa có lịch học nào. Hãy bấm + ở cột ngày từ Thứ 2 đến Chủ nhật để thêm.',
                'This class has no schedule slots yet. Click + on any day column (Mon–Sun) to add one.',
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { getSavedAccessToken } from '@/features/auth/api';
import {
  getStudentResumeStatuses,
  type ResumeStudentStatus,
} from '@/features/resume/api';
import type { AppHeaderItem, LinkRowTone } from '@/shared/ui';
import { AppHeader, ClassCard, LinkRow, SearchField, Toast } from '@/shared/ui';

import styles from './page.module.css';

const navigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[];

const grades = [
  { label: '1학년', value: 1 },
  { label: '2학년', value: 2 },
  { label: '3학년', value: 3 },
] as const;

const classes = [1, 2, 3, 4] as const;

type Grade = (typeof grades)[number]['value'];
type ClassNumber = (typeof classes)[number];

type SelectedClass = {
  readonly grade: Grade;
  readonly classNumber: ClassNumber;
};

type StudentLoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'failure'; readonly message: string }
  | {
      readonly kind: 'success';
      readonly lastUpdatedAt: string;
      readonly schoolYear: number | undefined;
      readonly students: readonly ResumeStudentStatus[];
    };

const submissionLabels: Record<
  ResumeStudentStatus['submissionStatus'],
  string
> = {
  DELETED: '삭제됨',
  ONGOING: '작성 중',
  RELEASED: '공개됨',
  SUBMITTED: '제출 완료',
};
const emptyStudents: readonly ResumeStudentStatus[] = [];

function getStudentTone(student: ResumeStudentStatus): LinkRowTone {
  return student.submitted ? 'submitted' : 'missing';
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function TeacherStudentsPage() {
  return (
    <Suspense fallback={null}>
      <TeacherStudentsContent />
    </Suspense>
  );
}

function TeacherStudentsContent() {
  const [selectedClass, setSelectedClass] = useState<SelectedClass | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loadState, setLoadState] = useState<StudentLoadState>({
    kind: 'loading',
  });
  const dialogCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadStudents = async () => {
      await Promise.resolve();

      if (!isActive) {
        return;
      }

      const accessToken = getSavedAccessToken();

      if (!accessToken) {
        setLoadState({
          kind: 'failure',
          message: '로그인 정보가 없어 학생 목록을 불러올 수 없습니다.',
        });
        return;
      }

      const result = await getStudentResumeStatuses({ accessToken });

      if (!isActive) {
        return;
      }

      if (result.kind !== 'success') {
        setLoadState({ kind: 'failure', message: result.message });
        return;
      }

      setLoadState({
        kind: 'success',
        lastUpdatedAt: result.lastUpdatedAt,
        schoolYear: result.schoolYear,
        students: result.students,
      });
    };

    void loadStudents();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      return undefined;
    }

    dialogCloseButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedClass(null);
      }
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      dialogTriggerRef.current?.focus();
      dialogTriggerRef.current = null;
    };
  }, [selectedClass]);

  const selectedClassLabel = useMemo(() => {
    if (!selectedClass) {
      return '';
    }

    const schoolYear =
      loadState.kind === 'success' ? loadState.schoolYear : undefined;
    const yearLabel = schoolYear ? `${schoolYear} ` : '';

    return `${yearLabel}${selectedClass.grade}학년 ${selectedClass.classNumber}반`;
  }, [loadState, selectedClass]);

  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase('ko-KR');
  const students =
    loadState.kind === 'success' ? loadState.students : emptyStudents;
  const selectedStudents = useMemo(() => {
    if (!selectedClass) {
      return [];
    }

    return students.filter(
      (student) =>
        student.grade === selectedClass.grade &&
        student.classNumber === selectedClass.classNumber &&
        (!normalizedSearchQuery ||
          student.name
            .toLocaleLowerCase('ko-KR')
            .includes(normalizedSearchQuery))
    );
  }, [normalizedSearchQuery, selectedClass, students]);

  const countStudents = (grade: Grade, classNumber: ClassNumber) =>
    students.filter(
      (student) =>
        student.grade === grade && student.classNumber === classNumber
    ).length;

  return (
    <main
      className={styles.page}
      data-dialog-open={selectedClass ? 'true' : 'false'}
    >
      <AppHeader activeItem="students" items={navigationItems} />
      {loadState.kind === 'failure' ? (
        <div className={styles.toastLayer}>
          <Toast variant="error">{loadState.message}</Toast>
        </div>
      ) : null}

      <section className={styles.content} aria-labelledby="students-title">
        <div
          className={styles.contentLayer}
          inert={selectedClass ? true : undefined}
        >
          <div className={styles.hero}>
            <h1 className={styles.title} id="students-title">
              학생 관리
            </h1>
            <p className={styles.description}>
              학생들의 이력서를 확인하고, 피드백을 달아보세요!
            </p>
            <SearchField
              className={styles.searchField}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              spellCheck={false}
            />
          </div>

          <div className={styles.gradeGrid} aria-label="학년별 반 목록">
            {grades.map((grade) => (
              <section
                className={styles.gradeColumn}
                aria-labelledby={`grade-${grade.value}`}
                key={grade.value}
              >
                <h2 className={styles.gradeTitle} id={`grade-${grade.value}`}>
                  {grade.label}
                </h2>
                <div className={styles.divider} />
                <div className={styles.classList}>
                  {classes.map((classNumber) => (
                    <ClassCard
                      count={countStudents(grade.value, classNumber)}
                      key={`${grade.value}-${classNumber}`}
                      title={`${classNumber}반`}
                      onClick={(event) => {
                        dialogTriggerRef.current = event.currentTarget;
                        setSelectedClass({ classNumber, grade: grade.value });
                      }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {selectedClass ? (
          <div
            className={styles.dialogLayer}
            role="presentation"
            onMouseDown={() => setSelectedClass(null)}
          >
            <section
              aria-labelledby="class-dialog-title"
              aria-modal="true"
              className={styles.dialog}
              role="dialog"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                aria-label="반 상세 닫기"
                className={styles.closeButton}
                ref={dialogCloseButtonRef}
                type="button"
                onClick={() => setSelectedClass(null)}
              >
                ×
              </button>

              <header className={styles.dialogHeader}>
                <h2 className={styles.dialogTitle} id="class-dialog-title">
                  {selectedClassLabel}
                </h2>
                {loadState.kind === 'success' ? (
                  <p className={styles.updatedAt}>
                    최근 갱신 {formatUpdatedAt(loadState.lastUpdatedAt)}
                  </p>
                ) : null}
              </header>

              <div className={styles.dialogDivider} />

              <div
                className={styles.studentRows}
                aria-label={`${selectedClassLabel} 학생 제출 현황`}
              >
                {loadState.kind === 'loading' ? (
                  <p className={styles.emptyMessage}>
                    학생 목록을 불러오는 중입니다.
                  </p>
                ) : null}
                {loadState.kind === 'failure' ? (
                  <p className={styles.emptyMessage} role="alert">
                    {loadState.message}
                  </p>
                ) : null}
                {loadState.kind === 'success' &&
                selectedStudents.length === 0 ? (
                  <p className={styles.emptyMessage}>
                    {normalizedSearchQuery
                      ? '검색 결과가 없습니다.'
                      : '등록된 학생이 없습니다.'}
                  </p>
                ) : null}
                {loadState.kind === 'success'
                  ? selectedStudents.map((student) => {
                      const sharedProps = {
                        actionLabel: student.resumeId
                          ? '레주메 보러가기'
                          : '이력서 없음',
                        className: styles.studentRow,
                        key: student.studentId,
                        meta: student.majorName,
                        status: submissionLabels[student.submissionStatus],
                        title: `${student.schoolNumber} ${student.name}`,
                        tone: getStudentTone(student),
                      } as const;

                      return student.resumeId ? (
                        <LinkRow
                          {...sharedProps}
                          href={`/students/${student.resumeId}`}
                        />
                      ) : (
                        <LinkRow {...sharedProps} disabled />
                      );
                    })
                  : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

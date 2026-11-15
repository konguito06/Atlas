import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Exam, ExamDraft, ExamsData } from "./exams";
import type { Task } from "./tasks";

const examsKey = (workspaceId: string) => ["exams", workspaceId] as const;
// Matches the key in use-tasks.ts: deleting an exam unlinks cached tasks.
const tasksKey = (workspaceId: string) => ["tasks", workspaceId] as const;

export function useExams(data: ExamsData, workspaceId: string) {
  return useQuery({
    queryKey: examsKey(workspaceId),
    queryFn: () => data.listExams(workspaceId),
  });
}

export function useCreateExam(data: ExamsData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string } & ExamDraft) =>
      data.createExam({ ...input, workspaceId }),
    onSuccess: (created) => {
      queryClient.setQueryData<Exam[]>(examsKey(workspaceId), (exams = []) => [
        ...exams,
        created,
      ]);
    },
  });
}

export function useUpdateExam(data: ExamsData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...draft }: { id: string } & ExamDraft) =>
      data.updateExam(id, draft),
    onSuccess: (saved) => {
      queryClient.setQueryData<Exam[]>(examsKey(workspaceId), (exams = []) =>
        exams.map((exam) => (exam.id === saved.id ? saved : exam)),
      );
    },
  });
}

export function useDeleteExam(data: ExamsData, workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteExam(id),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Exam[]>(examsKey(workspaceId), (exams = []) =>
        exams.filter((exam) => exam.id !== id),
      );
      // Its tasks are kept, without the link.
      queryClient.setQueryData<Task[]>(tasksKey(workspaceId), (tasks = []) =>
        tasks.map((task) =>
          task.examId === id ? { ...task, examId: null } : task,
        ),
      );
    },
  });
}

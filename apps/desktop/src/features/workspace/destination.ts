import type { ScheduleArea } from "@/features/schedule/schedule-view";
import type { TasksArea } from "@/features/tasks/tasks-exams-view";
import type { Page } from "./sidebar";

/**
 * Somewhere in the app to go: a section, and optionally the area or the
 * single thing inside it to show. Links on Home, search results and
 * commands all navigate by handing one of these to the shell.
 */
export interface Destination {
  page: Page;
  /** Documents: the document to open. */
  documentId?: string;
  /** Tasks & Exams: the area to show, or the task or exam to open. */
  tasksArea?: TasksArea;
  taskId?: string;
  examId?: string;
  /** Schedule: the area to show, the date to show, the event to open. */
  scheduleArea?: ScheduleArea;
  date?: string;
  eventId?: string;
}

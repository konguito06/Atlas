import type { AtlasData } from "@atlas/core";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DeadlinesView } from "./deadlines-view";
import { ExamsView } from "./exams-view";
import { TasksView } from "./tasks-view";

const AREAS = [
  { value: "tasks", label: "Tasks" },
  { value: "exams", label: "Exams" },
  { value: "deadlines", label: "Deadlines" },
] as const;
export type TasksArea = (typeof AREAS)[number]["value"];

/** The Tasks & Exams section: three ways into what has to be done. */
export function TasksExamsView({
  data,
  workspaceId,
  initialArea,
  initialTaskId,
  initialExamId,
}: {
  data: AtlasData;
  workspaceId: string;
  /** The area to show first, when arriving from a link to it. */
  initialArea?: TasksArea;
  /** A task or an exam to open straight away, when arriving from search. */
  initialTaskId?: string;
  initialExamId?: string;
}) {
  const [area, setArea] = useState<TasksArea>(
    initialArea ?? (initialExamId ? "exams" : "tasks"),
  );

  return (
    <>
      <div className="mx-auto w-full max-w-3xl px-12 pt-14">
        <SegmentedControl
          label="Show"
          value={area}
          options={AREAS}
          onChange={setArea}
        />
      </div>
      {area === "tasks" && (
        <TasksView
          data={data}
          workspaceId={workspaceId}
          initialTaskId={initialTaskId}
        />
      )}
      {area === "exams" && (
        <ExamsView
          data={data}
          workspaceId={workspaceId}
          initialExamId={initialExamId}
        />
      )}
      {area === "deadlines" && (
        <DeadlinesView data={data} workspaceId={workspaceId} />
      )}
    </>
  );
}

import type { AtlasData } from "@atlas/core";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TimetableView } from "@/features/timetable/timetable-view";
import { CalendarView } from "./calendar-view";

const AREAS = [
  { value: "calendar", label: "Calendar" },
  { value: "timetable", label: "Timetable" },
] as const;
export type ScheduleArea = (typeof AREAS)[number]["value"];

/**
 * The Schedule section. The calendar shows everything by date; the
 * timetable is where the weekly routine it repeats is set up.
 */
export function ScheduleView({
  data,
  workspaceId,
  initialArea = "calendar",
}: {
  data: AtlasData;
  workspaceId: string;
  /** The area to show first, when arriving from a link to it. */
  initialArea?: ScheduleArea;
}) {
  const [area, setArea] = useState(initialArea);

  return (
    <>
      <div className="mx-auto w-full max-w-5xl px-12 pt-14">
        <SegmentedControl
          label="Show"
          value={area}
          options={AREAS}
          onChange={setArea}
        />
      </div>
      {area === "calendar" && (
        <CalendarView data={data} workspaceId={workspaceId} />
      )}
      {area === "timetable" && (
        <TimetableView data={data} workspaceId={workspaceId} />
      )}
    </>
  );
}

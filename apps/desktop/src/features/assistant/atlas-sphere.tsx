import type { AssistantStatus } from "@atlas/core";
import { cn } from "@/lib/utils";

interface AtlasSphereProps {
  /** What the assistant is doing; the sphere moves differently for each. */
  status?: AssistantStatus;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
}

/**
 * The face of the assistant: a slowly turning sphere in the ATLAS colours.
 * It is only a picture. Whatever contains it says what it means, and its
 * look is in index.css under .atlas-sphere.
 */
export function AtlasSphere({
  status = "idle",
  size = 96,
  className,
}: AtlasSphereProps) {
  return (
    <span
      aria-hidden="true"
      data-status={status}
      className={cn("atlas-sphere", className)}
      style={{ width: size, height: size }}
    >
      <span className="atlas-sphere-halo" />
      <span className="atlas-sphere-body">
        <span className="atlas-sphere-current" />
        <span className="atlas-sphere-current atlas-sphere-current-counter" />
        <span className="atlas-sphere-glint" />
      </span>
    </span>
  );
}

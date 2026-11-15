import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";

interface SegmentedControlProps<Value extends string> {
  /** Names the group for screen readers. */
  label: string;
  value: Value;
  options: ReadonlyArray<{ value: Value; label: string; icon?: LucideIcon }>;
  onChange: (value: Value) => void;
  className?: string;
}

/** A row of choices where exactly one is on, like a Mac segmented control. */
function SegmentedControl<Value extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<Value>) {
  const name = useId();
  return (
    <fieldset
      data-slot="segmented-control"
      className={cn(
        "inline-flex rounded-lg bg-foreground/8 p-0.5 text-sm",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map(({ value: option, label: text, icon: Icon }) => (
        <label
          key={option}
          className="flex h-7 items-center gap-1.5 rounded-md px-3 text-muted-foreground transition-[background-color,color,box-shadow] duration-150 select-none has-checked:bg-card has-checked:font-medium has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type="radio"
            name={name}
            value={option}
            checked={option === value}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          {Icon && <Icon aria-hidden="true" className="size-3.5" />}
          {text}
        </label>
      ))}
    </fieldset>
  );
}

export { SegmentedControl };

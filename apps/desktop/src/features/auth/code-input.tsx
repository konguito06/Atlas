import { SIGN_IN_CODE_LENGTH } from "@atlas/core";
import { cn } from "@/lib/utils";

interface CodeInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

const HALF = SIGN_IN_CODE_LENGTH / 2;

/** One real input drawn as six cells, so paste and autofill work as usual. */
export function CodeInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: CodeInputProps) {
  const digits = Array.from(
    { length: SIGN_IN_CODE_LENGTH },
    (_, index) => value[index] ?? "",
  );
  // The cell the next digit lands in; the last one once the code is complete.
  const activeIndex = Math.min(value.length, SIGN_IN_CODE_LENGTH - 1);

  return (
    <div className="group relative w-fit">
      <div aria-hidden="true" className="flex gap-2">
        {digits.map((digit, index) => (
          <div
            key={index}
            className={cn(
              "flex h-14 w-11 items-center justify-center rounded-lg border border-input font-heading text-2xl tabular-nums transition-colors",
              index === HALF && "ml-3",
              index === activeIndex &&
                "group-focus-within:border-ring group-focus-within:ring-3 group-focus-within:ring-ring/50",
              invalid && "border-destructive",
              disabled && "opacity-50",
            )}
          >
            {digit}
          </div>
        ))}
      </div>
      <input
        id={id}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value.replace(/\D/g, "").slice(0, SIGN_IN_CODE_LENGTH),
          )
        }
        inputMode="numeric"
        autoComplete="one-time-code"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        // biome-ignore lint/a11y/noAutofocus: this step exists only to type the code
        autoFocus
        className="absolute inset-0 cursor-text opacity-0"
      />
    </div>
  );
}

CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" text NOT NULL,
	"due_date" date NOT NULL,
	"due_time" time,
	"completed" boolean DEFAULT false NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "deadlines_title_length" CHECK (char_length(btrim("deadlines"."title")) between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "deadlines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "timetable_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timetable_id" uuid NOT NULL,
	"title" text NOT NULL,
	"day" smallint NOT NULL,
	"start_minute" smallint NOT NULL,
	"end_minute" smallint NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'blue' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timetable_entries_title_length" CHECK (char_length(btrim("timetable_entries"."title")) between 1 and 100),
	CONSTRAINT "timetable_entries_day_valid" CHECK ("timetable_entries"."day" between 1 and 7),
	CONSTRAINT "timetable_entries_time_valid" CHECK ("timetable_entries"."start_minute" between 0 and 1439 and "timetable_entries"."end_minute" between 1 and 1440 and "timetable_entries"."end_minute" > "timetable_entries"."start_minute"),
	CONSTRAINT "timetable_entries_location_length" CHECK (char_length("timetable_entries"."location") <= 100),
	CONSTRAINT "timetable_entries_color_valid" CHECK ("timetable_entries"."color" in ('slate', 'blue', 'green', 'amber', 'rose', 'violet'))
);
--> statement-breakpoint
ALTER TABLE "timetable_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "timetables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"days" smallint[] DEFAULT '{1,2,3,4,5}' NOT NULL,
	"start_hour" smallint DEFAULT 8 NOT NULL,
	"end_hour" smallint DEFAULT 20 NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timetables_name_length" CHECK (char_length(btrim("timetables"."name")) between 1 and 100),
	CONSTRAINT "timetables_days_valid" CHECK (cardinality("timetables"."days") between 1 and 7 and "timetables"."days" <@ '{1,2,3,4,5,6,7}'::smallint[]),
	CONSTRAINT "timetables_hours_valid" CHECK ("timetables"."start_hour" between 0 and 23 and "timetables"."end_hour" between 1 and 24 and "timetables"."end_hour" > "timetables"."start_hour")
);
--> statement-breakpoint
ALTER TABLE "timetables" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_timetable_id_timetables_id_fk" FOREIGN KEY ("timetable_id") REFERENCES "public"."timetables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetables" ADD CONSTRAINT "timetables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deadlines_workspace_id_due_date_idx" ON "deadlines" USING btree ("workspace_id","due_date");--> statement-breakpoint
CREATE INDEX "timetable_entries_timetable_id_idx" ON "timetable_entries" USING btree ("timetable_id");--> statement-breakpoint
CREATE INDEX "timetables_workspace_id_idx" ON "timetables" USING btree ("workspace_id");
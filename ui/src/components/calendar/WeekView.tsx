"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostChip, type ScheduledPost } from "./PostChip";

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function WeekCell({
  dateStr,
  hour,
  posts,
  isToday,
  onPostClick,
}: {
  dateStr: string;
  hour: number;
  posts: ScheduledPost[];
  isToday: boolean;
  onPostClick?: (post: ScheduledPost) => void;
}) {
  const droppableId = `hour:${dateStr}T${String(hour).padStart(2, "0")}`;
  const { isOver, setNodeRef } = useDroppable({ id: droppableId });

  const now = new Date();
  const isCurrentHour = isToday && now.getHours() === hour;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[52px] border-b border-r border-border/30 p-1.5 transition-all duration-200 relative ${
        isToday ? "bg-accent/[0.02]" : ""
      } ${isOver ? "!bg-accent/10 ring-1 ring-inset ring-accent/30" : ""}`}
    >
      {/* Current hour accent line */}
      {isCurrentHour && (
        <div className="absolute top-0 left-0 right-0 h-px bg-accent" />
      )}
      <div className="space-y-1">
        {posts.map((p) => (
          <PostChip key={p.id} post={p} compact onClick={onPostClick} />
        ))}
      </div>
    </div>
  );
}

interface WeekViewProps {
  posts: ScheduledPost[];
  onPostClick?: (post: ScheduledPost) => void;
}

export function WeekView({ posts, onPostClick }: WeekViewProps) {
  const today = new Date();
  const todayStr = formatDateStr(today);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return {
      dateStr: formatDateStr(d),
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: d.getDate(),
      isToday: formatDateStr(d) === todayStr,
    };
  });

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const headerLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.toLocaleDateString("en-US", { month: "long" })} ${weekStart.getDate()} \u2013 ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
      : `${weekStart.toLocaleDateString("en-US", { month: "short" })} ${weekStart.getDate()} \u2013 ${weekEnd.toLocaleDateString("en-US", { month: "short" })} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToToday = () => setWeekStart(getWeekStart(new Date()));

  const getPostsForCell = (dateStr: string, hour: number) =>
    posts.filter((p) => {
      if (!p.scheduledFor.startsWith(dateStr)) return false;
      return new Date(p.scheduledFor).getHours() === hour;
    });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 52 * 6;
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">{headerLabel}</h2>
        </div>
        <Button variant="secondary" size="sm" onClick={goToToday}>
          Today
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="rounded-xl bg-surface-1 border border-border shadow-elevation-1 overflow-auto"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        <div
          className="grid min-w-[800px]"
          style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
        >
          {/* Sticky day headers */}
          <div className="sticky top-0 z-20 bg-surface-1 border-b border-r border-border/30" />
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={`sticky top-0 z-20 bg-surface-1 border-b border-r border-border/30 py-3 text-center ${
                day.isToday ? "bg-accent/5" : ""
              }`}
            >
              <div className="text-[11px] text-muted uppercase tracking-wider font-medium">
                {day.dayName}
              </div>
              <div
                className={
                  day.isToday
                    ? "mt-1 bg-accent text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto text-sm font-bold"
                    : "mt-1 text-sm font-semibold"
                }
              >
                {day.dayNum}
              </div>
            </div>
          ))}

          {/* Hour rows */}
          {Array.from({ length: 24 }, (_, hour) => (
            <Fragment key={hour}>
              <div className="sticky left-0 z-10 bg-surface-1 border-b border-r border-border/30 flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] text-muted leading-none whitespace-nowrap font-medium">
                  {formatHour(hour)}
                </span>
              </div>
              {weekDays.map((day) => (
                <WeekCell
                  key={`${day.dateStr}-${hour}`}
                  dateStr={day.dateStr}
                  hour={hour}
                  posts={getPostsForCell(day.dateStr, hour)}
                  isToday={day.isToday}
                  onPostClick={onPostClick}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

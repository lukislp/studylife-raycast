// View command: picks a course (open goals, or the full catalogue) and starts the shared focus
// timer for it - or keeps whatever course is already set via the "Start now" quick option. v1 was
// a no-view instant-start action; v2's course picker needs somewhere to render, so this command
// moved from "no-view" to "view" (see package.json and CoursePickerList.tsx).
import CoursePickerList from "./components/CoursePickerList";

export default function StartFocusTimer() {
  return <CoursePickerList />;
}

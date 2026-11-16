/** Original subject palette from the 2026–27 Alveary Course Picker:
 * kkeel/course-picker/js/app.js subjectColors. Keep exact hex values. */
export const subjectColors = Object.freeze({
  "Basic Supplies": "#5A5D66",
  "Architecture": "#a0a6be",
  "Art": "#907061",
  "Bible": "#964945",
  "Citizenship": "#62765c",
  "English": "#9b5b7b",
  "Geography": "#4d8da2",
  "History": "#6b6bbf",
  "Latin": "#5a5373",
  "Life Skills": "#d1b358",
  "Literature": "#c07669",
  "Math": "#6d7eaa",
  "Modern Language": "#6db4b2",
  "Music": "#9e6bac",
  "Physical Education": "#bd855e",
  "Science": "#96a767",
  "Alt. Science Options": "#96a767",
});
export function subjectColor(name) {
  const key = Object.keys(subjectColors).find(k=>k.toLowerCase()===(name||"").toLowerCase());
  return key ? subjectColors[key] : "#7e937e";
}

// Shared Course List eligibility and safe Airtable guidance parsing.
// Choice tags do NOT impose their own grade restrictions. The curriculum plan
// and selected edition's ordinary published grade rules remain authoritative.
export function matchesCourseGrades(course, selectedGrades) {
  if (!selectedGrades.length) return true;
  if (course.grades.some(grade => selectedGrades.includes(grade))) return true;
  if (!course.gradeDisplay?.trim().endsWith("+")) return false;
  const lowest = Math.min(...course.grades);
  return Number.isFinite(lowest) && selectedGrades.some(grade => grade >= lowest);
}

// Airtable's linked rich-text editor returns Markdown-style [label](url).
// Parse text into React-safe renderable segments; never render source HTML.
export function guidanceSegments(markdown) {
  const text = String(markdown ?? "");
  const parts = [];
  const link = /\[([^\]\n]+)\]\((https?:\/\/[^\s)<>]+)\)/gi;
  let last = 0;
  for (const match of text.matchAll(link)) {
    if (match.index > last) parts.push({kind:"text",text:text.slice(last,match.index)});
    let safe = false;
    try {
      const uri = new URL(match[2]);
      safe = ["https:","http:"].includes(uri.protocol);
    } catch { /* Leave malformed or unsafe link as plain text */ }
    if (safe) {
      parts.push({kind:"link",text:match[1],href:match[2]});
    } else {
      parts.push({kind:"text",text:match[0]});
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({kind:"text",text:text.slice(last)});
  return parts;
}

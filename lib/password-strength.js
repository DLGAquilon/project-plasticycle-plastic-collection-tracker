export function assessPassword(password) {
  const value = String(password || "");
  const rules = [
    { id: "length", label: "10 to 128 characters", met: value.length >= 10 && value.length <= 128 },
    { id: "letter", label: "At least one letter", met: /[A-Za-z]/.test(value) },
    { id: "number", label: "At least one number", met: /[0-9]/.test(value) },
  ];
  const ready = rules.every((rule) => rule.met);
  const varied = (/[a-z]/.test(value) && /[A-Z]/.test(value)) || /[^A-Za-z0-9]/.test(value);
  let level = "weak";
  if (!value) level = "empty";
  else if (ready && value.length >= 14 && varied) level = "strong";
  else if (ready) level = "okay";
  return { level, rules, ready };
}

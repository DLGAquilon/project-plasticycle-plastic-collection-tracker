export const ROLES = ["platform_admin", "org_admin", "middleman", "viewer"];

export const ORG_KINDS = ["barangay", "campus", "city", "institution"];

export const UNIT_KINDS = {
  barangay: ["sitio", "purok"],
  campus: ["department", "office"],
  city: ["barangay", "district"],
  institution: ["department", "office"],
};

const MATRIX = {
  platform_admin: [
    "org:create",
    "season:manage",
    "season:join",
    "user:create:org_admin",
    "user:create:middleman",
    "user:create:viewer",
    "user:deactivate",
    "unit:manage",
    "collection:void",
    "audit:read",
    "people:read",
    "forecast:read",
    "standings:read",
    "ledger:read",
  ],
  org_admin: [
    "season:join",
    "user:create:middleman",
    "user:create:viewer",
    "user:deactivate",
    "unit:manage",
    "collection:create",
    "collection:void",
    "audit:read",
    "people:read",
    "forecast:read",
    "standings:read",
    "ledger:read",
  ],
  middleman: ["collection:create", "forecast:read", "standings:read", "ledger:own"],
  viewer: ["forecast:read", "standings:read", "ledger:totals"],
};

const GRANTED = Object.fromEntries(
  Object.entries(MATRIX).map(([role, actions]) => [role, new Set(actions)]),
);

export function can(role, action) {
  return Boolean(GRANTED[role]?.has(action));
}

export function roleLabel(role) {
  return {
    platform_admin: "Platform admin",
    org_admin: "Organization admin",
    middleman: "Middleman",
    viewer: "Viewer",
  }[role] || role;
}

export function kindLabel(kind) {
  return {
    barangay: "Barangay",
    campus: "Campus",
    city: "City",
    institution: "Institution",
    sitio: "Sitio",
    purok: "Purok",
    department: "Department",
    office: "Office",
    district: "District",
  }[kind] || kind;
}

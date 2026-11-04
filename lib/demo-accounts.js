export const DEMO_PASSWORD = {
  platform: "Plast1Cycle!Admin",
  barangayAdmin: "Barangay!Lead1",
  campusAdmin: "Campus!Lead1",
  cityAdmin: "City!Lead1",
  barangayMiddleman: "Weigh!Station1",
  campusMiddleman: "Weigh!Station2",
  cityMiddleman: "Weigh!Station3",
  matinaMiddleman: "Weigh!Matina1",
  riversideMiddleman: "Weigh!River1",
  tagumMiddleman: "Weigh!Tagum1",
  viewer: "View!Only001",
};

export const DEMO_ACCOUNTS = [
  {
    label: "Barangay middleman",
    detail: "Weighs plastic for Barangay San Antonio",
    email: "antonio.weigh@plasticycle.app",
    password: DEMO_PASSWORD.barangayMiddleman,
  },
  {
    label: "Barangay admin",
    detail: "Officials for Barangay San Antonio",
    email: "antonio.admin@plasticycle.app",
    password: DEMO_PASSWORD.barangayAdmin,
  },
  {
    label: "Campus admin",
    detail: "Sustainability office for MMCM",
    email: "mmcm.admin@plasticycle.app",
    password: DEMO_PASSWORD.campusAdmin,
  },
  {
    label: "City middleman",
    detail: "Weighs plastic for the Davao City office",
    email: "davao.weigh@plasticycle.app",
    password: DEMO_PASSWORD.cityMiddleman,
  },
  {
    label: "Campus viewer",
    detail: "Read-only view for MMCM",
    email: "mmcm.view@plasticycle.app",
    password: DEMO_PASSWORD.viewer,
  },
  {
    label: "Platform admin",
    detail: "Runs organizations, seasons, and access",
    email: "platform@plasticycle.app",
    password: DEMO_PASSWORD.platform,
  },
];

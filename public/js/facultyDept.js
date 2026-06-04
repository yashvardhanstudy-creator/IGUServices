const facultyDeptMap = {
  "Behavioural and Cognitive Sciences": ["Psychology"],
  "Commerce, Management, Tourism & Hospitality": [
    "Commerce",
    "Management",
    "Hotel & Tourism Management",
  ],
  "Earth and Space Sciences": ["Geography"],
  "Engineering & Technology": ["Computer Science & Engineering"],
  Humanities: ["Hindi", "English", "Journalism & Mass Communication"],
  Law: ["Law"],
  "Life Sciences": [
    "Biotechnology",
    "Botany",
    "Environmental Science",
    "Zoology",
  ],
  "Pharmaceutical Sciences": ["Pharmaceutical Sciences"],
  "Physical Sciences": ["Chemistry", "Mathematics", "Physics"],
  "Social Sciences": [
    "Political Science",
    "Defence Studies",
    "History",
    "Social Work",
  ],
  "Sports Science": ["Yoga"],
  Education: ["Education", "Physical Education"],
  "Indic Studies": [],
  "Art, Aesthetic & Design": [],
};

function initFacultyDropdown(
  facId,
  deptId,
  selectedFac,
  selectedDept,
  containerId = "",
) {
  const facSelect = document.getElementById(facId);
  if (!facSelect) return;

  facSelect.innerHTML = '<option value="">-- Select Faculty --</option>';
  Object.keys(facultyDeptMap).forEach((fac) => {
    const option = document.createElement("option");
    option.value = fac;
    option.textContent = fac;
    if (fac === selectedFac) option.selected = true;
    facSelect.appendChild(option);
  });

  populateDepartments(facId, deptId, selectedDept, containerId);
}

function populateDepartments(
  facId,
  deptId,
  selectedDept = "",
  containerId = "",
) {
  const facSelect = document.getElementById(facId);
  const deptSelect = document.getElementById(deptId);
  const container = containerId ? document.getElementById(containerId) : null;

  if (!facSelect || !deptSelect) return;

  const selectedFac = facSelect.value;
  deptSelect.innerHTML = '<option value="">-- Select Department --</option>';

  if (
    selectedFac &&
    facultyDeptMap[selectedFac] &&
    facultyDeptMap[selectedFac].length > 0
  ) {
    if (container) container.style.display = "";
    deptSelect.setAttribute("required", "required");
    facultyDeptMap[selectedFac].forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept;
      option.textContent = dept;
      if (dept === selectedDept) option.selected = true;
      deptSelect.appendChild(option);
    });
  } else {
    if (container) container.style.display = "none";
    deptSelect.removeAttribute("required");
  }
}

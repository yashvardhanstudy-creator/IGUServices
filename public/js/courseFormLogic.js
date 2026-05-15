const schemes = {
  "4+0": {
    credits: { theory: 4, practical: 0, total: 4 },
    marks: {
      internalTheory: 30,
      internalPractical: 0,
      internalTotal: 30,
      endTermTheory: 70,
      endTermPractical: 0,
      endTermTotal: 70,
      maxMarks: 100,
    },
    examDuration: "3 Hours",
    theoryUnits: 4,
    instructions: {
      theory:
        "The paper setter shall prepare 9 questions selecting two questions from each unit with consideration <br> given to the Course Learning Outcomes. Among these, question number 1 will be compulsory question, <br> comprising 7 short answer type questions carrying two marks each (total 14 marks) and covering the <br> entire syllabus. The remaining questions will be carrying 14 marks each. Examinees will be required to <br> attempt five questions: the compulsory question no. 1 and 1 question from the each of the four units. ",
      practical: "",
    },
    evaluation: {
      internal_th_total: 30,
      internal_pr_total: 0,
      end_term_total: 70,
      end_term_th_total: 70,
      end_term_pr_total: 0,
      class_participation_th: 5,
      class_participation_pr: "NA",
      seminar_th: 10,
      seminar_pr: "NA",
      mid_term_th: 15,
      seminar_demo_pr: "NA",
      lab_record_pr: "NA",
      viva_voce_pr: "NA",
      execution_pr: "NA",
      written_exam_th: 70,
    },
  },
  "0+4": {
    credits: { theory: 0, practical: 4, total: 4 },
    marks: {
      internalTheory: 0,
      internalPractical: 30,
      internalTotal: 30,
      endTermTheory: 0,
      endTermPractical: 70,
      endTermTotal: 70,
      maxMarks: 100,
    },
    examDuration: "4 Hours",
    theoryUnits: 4,
    instructions: {
      theory: "",
      practical:
        "Write-up and execution of the practical will be conducted as per the nature of the practical by <br> the external examiner, with consideration given to the Course Learning Outcomes. The <br> maximum marks for the write-up and execution of the practical will be <b>40</b>.",
    },
    evaluation: {
      internal_th_total: 0,
      internal_pr_total: 30,
      end_term_total: 70,
      end_term_th_total: 0,
      end_term_pr_total: 70,
      class_participation_th: "NA",
      class_participation_pr: 5,
      seminar_th: "NA",
      seminar_pr: "NA",
      mid_term_th: "NA",
      mid_term_pr: 15,
      seminar_demo_th: "NA",
      seminar_demo_pr: 10,
      lab_record_pr: 10,
      viva_voce_pr: 20,
      execution_pr: 40,
      written_exam_th: "NA",
    },
  },
  "3+1": {
    credits: { theory: 3, practical: 1, total: 4 },
    marks: {
      internalTheory: 20,
      internalPractical: 10,
      internalTotal: 30,
      endTermTheory: 50,
      endTermPractical: 20,
      endTermTotal: 70,
      maxMarks: 100,
    },
    examDuration: "3 Hours, 3 Hours",
    theoryUnits: 3,
    instructions: {
      theory:
        "The paper setter shall prepare 7 questions selecting two questions from each of the three units <br> with consideration given to the Course Learning Outcomes. Among these, question number 1 <br> will be compulsory question comprising 4 short answer type questions carrying two marks each <br> (total 08 marks) and covering the entire syllabus. The remaining questions will be carrying 14 <br> marks each. Examinees will be required to attempt four questions: the compulsory question no. 1 <br> and 1 question from the each of the three units.",
      practical:
        "Write-up and execution of the practical will be conducted as per the nature of the practical by <br> the external examiner, with consideration given to the Course Learning Outcomes. The <br> maximum marks for the write-up and execution of the practical will be 10.",
    },
    evaluation: {
      internal_th_total: 20,
      internal_pr_total: 10,
      end_term_total: 70,
      end_term_th_total: 50,
      end_term_pr_total: 20,
      class_participation_th: 5,
      class_participation_pr: "NA",
      seminar_th: 5,
      seminar_pr: "NA",
      mid_term_th: 10,
      seminar_demo_pr: 10,
      lab_record_pr: 5,
      viva_voce_pr: 5,
      execution_pr: 10,
      written_exam_th: 50,
    },
  },
  "2+2": {
    credits: { theory: 2, practical: 2, total: 4 },
    marks: {
      internalTheory: 15,
      internalPractical: 15,
      internalTotal: 30,
      endTermTheory: 35,
      endTermPractical: 35,
      endTermTotal: 70,
      maxMarks: 100,
    },
    examDuration: "2 Hours, 3 Hours",
    theoryUnits: 2,
    instructions: {
      theory:
        "The paper setter shall prepare 5 questions selecting two questions from each of the two units <br> with consideration given to the Course Learning Outcomes. Among these, question number 1 <br> will be compulsory question comprising 7 short answer type questions carrying one mark each <br> (total 07 marks) and covering the entire syllabus. The remaining questions will be carrying 14 <br> marks each. Examinees will be required to attempt three questions: the compulsory question no. <br> 1 and 1 question from the each of the two units. ",
      practical:
        "Write-up and execution of the practical will be conducted as per the nature of the practical by <br> the external examiner, with consideration given to the Course Learning Outcomes. The <br> maximum marks for the write-up and execution of the practical will be 20.",
    },
    evaluation: {
      internal_th_total: 15,
      internal_pr_total: 15,
      end_term_total: 70,
      end_term_th_total: 35,
      end_term_pr_total: 35,
      class_participation_th: 5,
      class_participation_pr: 5,
      seminar_th: 5,
      seminar_pr: "NA",
      mid_term_th: 5,
      mid_term_pr: "NA",
      seminar_demo_th: "NA",
      seminar_demo_pr: 10,
      lab_record_pr: 5,
      viva_voce_pr: 10,
      written_exam_th: 35,
      execution_pr: 20,
    },
  },
  "3+0": {
    credits: { theory: 3, practical: 0, total: 3 },
    marks: {
      internalTheory: 25,
      internalPractical: 0,
      internalTotal: 25,
      endTermTheory: 50,
      endTermPractical: 0,
      endTermTotal: 50,
      maxMarks: 75,
    },
    examDuration: "3 Hours",
    theoryUnits: 3,
    instructions: {
      theory:
        "The paper setter shall prepare 7 questions selecting two questions from each of the three units with <br> consideration given to the Course Learning Outcomes. Among these, question number 1 will be <br> compulsory question comprising 4 short answer type questions carrying two marks each (total 08 <br> marks) and covering the entire syllabus. The remaining questions will be carrying 14 marks each. <br> Examinees will be required to attempt four questions: the compulsory question no. 1 and 1 question <br> from the each of the three units.",
      practical: "",
    },
    evaluation: {
      internal_th_total: 25,
      internal_pr_total: 0,
      end_term_total: 50,
      end_term_th_total: 50,
      end_term_pr_total: 0,
      class_participation_th: 5,
      class_participation_pr: "NA",
      seminar_th: 5,
      seminar_pr: "NA",
      mid_term_th: 15,
      seminar_demo_pr: "NA",
      lab_record_pr: "NA",
      viva_voce_pr: "NA",
      execution_pr: "NA",
      written_exam_th: 50,
    },
  },
  "2+0": {
    credits: { theory: 2, practical: 0, total: 2 },
    marks: {
      internalTheory: 15,
      internalPractical: 0,
      internalTotal: 15,
      endTermTheory: 35,
      endTermPractical: 0,
      endTermTotal: 35,
      maxMarks: 50,
    },
    examDuration: "2 Hours",
    theoryUnits: 2,
    instructions: {
      theory:
        "The paper setter shall prepare <b>5 questions</b> selecting <b>two questions</b> from each unit with consideration given to the Course Learning Outcomes. Among these, question number 1 will be <b>compulsory</b>. Examinees will be required to attempt <b>three questions</b>: the compulsory question no. 1 and 1 question from each of the two units.",
      practical: "",
    },
    evaluation: {
      internal_th_total: 15,
      internal_pr_total: 0,
      end_term_total: 35,
      end_term_th_total: 35,
      end_term_pr_total: 0,
      class_participation_th: 5,
      class_participation_pr: "NA",
      seminar_th: 5,
      seminar_pr: "NA",
      mid_term_th: 5,
      seminar_demo_pr: "NA",
      lab_record_pr: "NA",
      viva_voce_pr: "NA",
      execution_pr: "NA",
      written_exam_th: 35,
    },
  },
  "1+1": {
    credits: { theory: 1, practical: 1, total: 2 },
    marks: {
      internalTheory: 10,
      internalPractical: 5,
      internalTotal: 15,
      endTermTheory: 20,
      endTermPractical: 15,
      endTermTotal: 35,
      maxMarks: 50,
    },
    examDuration: "2 Hours, 3 Hours",
    theoryUnits: 1,
    instructions: {
      theory:
        "The paper setter shall prepare 4 questions from unit 01 with consideration given to the Course <br> Learning Outcomes. Among these, question number 1 will be compulsory question comprising 6 <br> short answer type questions carrying one mark each (total 06 marks). The remaining questions <br> will be carrying 07 marks each. Examinees will be required to attempt three questions: the <br> compulsory question no. 1 and 02 questions from other 03 questions.",
      practical:
        "Write-up and execution of the practical will be conducted as per the nature of the practical by <br> the external examiner, with consideration given to the Course Learning Outcomes. The <br> maximum marks for the write-up and execution of the practical will be 5",
    },
    evaluation: {
      internal_th_total: 10,
      internal_pr_total: 5,
      end_term_total: 35,
      end_term_th_total: 20,
      end_term_pr_total: 15,
      class_participation_th: 5,
      class_participation_pr: 0,
      seminar_th: 0,
      seminar_pr: "NA",
      mid_term_th: 5,
      seminar_demo_pr: 5,
      lab_record_pr: 5,
      viva_voce_pr: 5,
      execution_pr: 5,
      written_exam_th: 20,
    },
  },
  "2+1": {
    credits: { theory: 2, practical: 1, total: 3 },
    marks: {
      internalTheory: 15,
      internalPractical: 5,
      internalTotal: 20,
      endTermTheory: 35,
      endTermPractical: 20,
      endTermTotal: 55,
      maxMarks: 75,
    },
    examDuration: "2 Hours, 3 Hours",
    theoryUnits: 2,
    instructions: {
      theory:
        "The paper setter shall prepare 5 questions selecting two questions from each of the two <br> units with consideration given to the Course Learning Outcomes. Among these, question <br> number 1 will be compulsory question comprising 7 short answer type questions carrying <br> one mark each (total 07 marks) and covering the entire syllabus. The remaining questions <br> will be carrying 14 marks each. Examinees will be required to attempt three questions: the <br> compulsory question no. 1 and 1 question from the each of the two units.",
      practical:
        "Write-up and execution of the practical will be conducted as per the nature of the <br> practical by the external examiner, with consideration given to the Course Learning <br> Outcomes. The maximum marks for the write-up and execution of the practical will be <br> 10.",
    },
    evaluation: {
      internal_th_total: 15,
      internal_pr_total: 10,
      end_term_total: 55,
      end_term_th_total: 35,
      end_term_pr_total: 20,
      class_participation_th: 5,
      class_participation_pr: "NA",
      seminar_th: 5,
      seminar_pr: "NA",
      mid_term_th: 5,
      seminar_demo_pr: 5,
      lab_record_pr: 5,
      viva_voce_pr: 5,
      execution_pr: 10,
      written_exam_th: 35,
    },
  },
};

function autofillForm() {
  const selectedSchemeKey = document.getElementById("creditScheme").value;
  if (!selectedSchemeKey) return;

  const scheme = schemes[selectedSchemeKey];

  // Autofill Credit and Marks table
  document.getElementById("credits_theory").value = scheme.credits.theory;
  document.getElementById("credits_practical").value = scheme.credits.practical;
  document.getElementById("credits_total").value = scheme.credits.total;

  document.getElementById("hours_theory").value = scheme.credits.theory;
  document.getElementById("hours_practical").value =
    scheme.credits.practical * 2;
  document.getElementById("hours_total").value =
    scheme.credits.theory + scheme.credits.practical * 2;

  // NEW: Calculate and set Total Contact Hours
  const theoryContactHours = scheme.credits.theory * 15;
  const practicalContactHours = scheme.credits.practical * 2 * 15;
  document.getElementById("contact_hours_theory").value = theoryContactHours;
  document.getElementById("contact_hours_practical").value =
    practicalContactHours;
  document.getElementById("contact_hours_total").value =
    theoryContactHours + practicalContactHours;

  // Auto-determine Nature of Course
  let nature = "";
  if (scheme.credits.theory > 0 && scheme.credits.practical > 0) {
    nature = "Theory + Practical";
  } else if (scheme.credits.theory > 0 && scheme.credits.practical === 0) {
    nature = "Theory(Theory + Tutorial)";
  } else if (scheme.credits.theory === 0 && scheme.credits.practical > 0) {
    nature = "Practical";
  }
  const natureInput = document.getElementById("natureOfCourse");
  if (natureInput) natureInput.value = nature;

  document.getElementById("marks_internal_theory").value =
    scheme.marks.internalTheory;
  document.getElementById("marks_internal_practical").value =
    scheme.marks.internalPractical;
  document.getElementById("marks_internal_total").value =
    scheme.marks.internalTotal;
  document.getElementById("marks_endterm_theory").value =
    scheme.marks.endTermTheory;
  document.getElementById("marks_endterm_practical").value =
    scheme.marks.endTermPractical;
  document.getElementById("marks_endterm_total").value =
    scheme.marks.endTermTotal;
  document.getElementById("marks_max").value = scheme.marks.maxMarks;

  // Dynamic Exam Duration Calculation
  let thDuration = 0;
  if (scheme.credits.theory >= 3) thDuration = 3;
  else if (scheme.credits.theory >= 1) thDuration = 2;

  let prDuration = 0;
  if (scheme.credits.practical >= 3) prDuration = 4;
  else if (scheme.credits.practical >= 1) prDuration = 3;

  let durationStr = "0 Hours";
  if (thDuration > 0 && prDuration > 0) {
    durationStr = `${thDuration} Hours, ${prDuration} Hours`;
  } else if (thDuration > 0) {
    durationStr = `${thDuration} Hours`;
  } else if (prDuration > 0) {
    durationStr = `${prDuration} Hours`;
  }
  document.getElementById("exam_duration").value = durationStr;

  // Autofill Instructions
  const theoryInstr = scheme.instructions.theory;
  const pracInstr = scheme.instructions.practical;

  const theoryContainer = document.getElementById("theory_container");
  const pracContainer = document.getElementById("practical_container");
  const theoryDiv = document.getElementById("instructions_theory");
  const pracDiv = document.getElementById("instructions_practical");
  const hiddenInstr = document.getElementById("paperSetterInstructions");

  let combinedInstructions = "";

  if (theoryInstr) {
    theoryContainer.style.display = "block";
    theoryDiv.innerHTML = theoryInstr;
    combinedInstructions += "Theory: " + theoryInstr + " ";
  } else {
    theoryContainer.style.display = "none";
    theoryDiv.innerHTML = "";
  }

  if (pracInstr) {
    pracContainer.style.display = "block";
    pracDiv.innerHTML = pracInstr;
    if (combinedInstructions.trim() !== "") {
      combinedInstructions = combinedInstructions.trim() + "<br><br>";
    }
    combinedInstructions += "Practical: " + pracInstr;
  } else {
    pracContainer.style.display = "none";
    pracDiv.innerHTML = "";
  }

  if (hiddenInstr) {
    hiddenInstr.value = combinedInstructions.trim();
  }

  // Generate Units
  const addPractical =
    scheme.credits.practical > 0 && selectedSchemeKey !== "0+4";
  generateUnits(
    scheme.theoryUnits,
    addPractical,
    theoryContactHours,
    practicalContactHours,
    selectedSchemeKey,
  );

  // Autofill Evaluation Table
  document.getElementById("eval_internal_th_total").innerText =
    `TH-${scheme.evaluation.internal_th_total}`;
  document.getElementById("eval_internal_pr_total").innerText =
    `PR-${scheme.evaluation.internal_pr_total}`;
  document.getElementById("eval_endterm_total").innerText =
    `End Term Examination: ${scheme.evaluation.end_term_total}`;
  document.getElementById("eval_endterm_th_total").innerText =
    `TH-${scheme.evaluation.end_term_th_total}`;
  document.getElementById("eval_endterm_pr_total").innerText =
    `PR-${scheme.evaluation.end_term_pr_total}`;

  document.getElementById("eval_cp_th").value =
    scheme.evaluation.class_participation_th;
  document.getElementById("eval_cp_pr").value =
    scheme.evaluation.class_participation_pr;
  document.getElementById("eval_seminar_th").value =
    scheme.evaluation.seminar_th;
  document.getElementById("eval_seminar_pr").value =
    scheme.evaluation.seminar_pr;
  document.getElementById("eval_midterm_th").value =
    scheme.evaluation.mid_term_th;
  document.getElementById("eval_midterm_pr").value =
    scheme.evaluation.mid_term_pr || "NA";
  document.getElementById("eval_seminar_demo_th").value =
    scheme.evaluation.seminar_demo_th || "NA";
  document.getElementById("eval_seminar_demo_pr").value =
    scheme.evaluation.seminar_demo_pr;
  document.getElementById("eval_written_exam_th").value =
    scheme.evaluation.written_exam_th;
  document.getElementById("eval_written_exam_pr").value =
    scheme.evaluation.written_exam_pr || "NA";
  document.getElementById("eval_lab_record_th").value =
    scheme.evaluation.lab_record_th || "NA";
  document.getElementById("eval_lab_record_pr").value =
    scheme.evaluation.lab_record_pr;
  document.getElementById("eval_viva_th").value =
    scheme.evaluation.viva_voce_th || "NA";
  document.getElementById("eval_viva_pr").value =
    scheme.evaluation.viva_voce_pr;
  document.getElementById("eval_execution_th").value =
    scheme.evaluation.execution_th || "NA";
  document.getElementById("eval_execution_pr").value =
    scheme.evaluation.execution_pr;
}

function generateUnits(
  count,
  addPracticalComponent = false,
  maxTheory,
  maxPractical,
  schemeKey,
) {
  const container = document.getElementById("unitsContainer");
  const footer = document.getElementById("unitsFooter");
  container.innerHTML = ""; // Clear existing units
  footer.innerHTML = ""; // Clear footer

  if (count === 0 && !addPracticalComponent) {
    container.innerHTML =
      '<tr><td colspan="4" style="text-align: center;">No syllabus units for this scheme.</td></tr>';
    return;
  }

  let unitIndex = 1;
  // This loop handles theory units for mixed/theory-only courses, and ALL units for 0+4
  for (let i = 1; i <= count; i++) {
    const isPracticalUnitFor0_4 = schemeKey === "0+4";
    const inputClass = isPracticalUnitFor0_4
      ? "contact-hour-practical"
      : "contact-hour-theory";

    const row = document.createElement("tr");
    row.innerHTML = `
            <td><input type="text" name="unitTitles[]" value="Unit-${i}" style="font-weight: bold;" required></td>
            <td>
                <div style="margin-bottom: 5px;">
                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 2px 6px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; background: #f9f9f9; border-radius: 3px;" title="Bold">B</button>
                </div>
                <div contenteditable="true" style="border: 1px solid #ccc; padding: 6px; min-height: 60px; border-radius: 4px; background-color: #fff; outline: none;" oninput="document.getElementById('hidden_topic_${unitIndex}').value = this.innerHTML" placeholder="Enter topics for Unit ${i}"></div>
                <input type="hidden" name="unitContents[]" id="hidden_topic_${unitIndex}">
            </td>
            <td><input type="text" name="unitCLOs[]"  style="width: 100%; border: 1px solid #ccc; padding: 4px; box-sizing: border-box; text-align: center;"></td>
            <td><input type="number" name="unitHours[]" class="${inputClass}" placeholder="Hours" required min="1" oninput="validateContactHours()"></td>
        `;
    container.appendChild(row);
    unitIndex++;
  }

  // This handles the single, readonly practical unit for MIXED courses (e.g., 2+2, 3+1)
  if (addPracticalComponent) {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td><input type="text" name="unitTitles[]" value="Practical Components" style="font-weight: bold;" required></td>
            <td>
                <div style="margin-bottom: 5px;">
                    <button type="button" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)" style="padding: 2px 6px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; background: #f9f9f9; border-radius: 3px;" title="Bold">B</button>
                </div>
                <div contenteditable="true" style="border: 1px solid #ccc; padding: 6px; min-height: 60px; border-radius: 4px; background-color: #fff; outline: none;" oninput="document.getElementById('hidden_topic_${unitIndex}').value = this.innerHTML" placeholder="Enter practical components"></div>
                <input type="hidden" name="unitContents[]" id="hidden_topic_${unitIndex}">
            </td>
            <td><input type="text" name="unitCLOs[]"  style="width: 100%; border: 1px solid #ccc; padding: 4px; box-sizing: border-box; text-align: center;"></td>
            <td><input type="number" name="unitHours[]" class="contact-hour-practical" value="${maxPractical}" readonly></td>
        `;
    container.appendChild(row);
  }

  // Generate the footer for validation display
  let footerHTML = "";
  if (maxTheory > 0 && schemeKey !== "0+4") {
    footerHTML += `
        <tr>
            <td colspan="3" style="text-align: right;">Total Theory Contact Hours:</td>
            <td id="theory_hours_total" data-max="${maxTheory}">0 / ${maxTheory}</td>
        </tr>
    `;
  }
  if (maxPractical > 0) {
    footerHTML += `
        <tr>
            <td colspan="3" style="text-align: right;">Total Practical Contact Hours:</td>
            <td id="practical_hours_total" data-max="${maxPractical}">0 / ${maxPractical}</td>
        </tr>
    `;
  }
  footer.innerHTML = footerHTML;
  validateContactHours(); // Initial validation call
}

function validateContactHours() {
  let currentTheory = 0;
  document.querySelectorAll(".contact-hour-theory").forEach((input) => {
    currentTheory += Number(input.value) || 0;
  });

  let currentPractical = 0;
  document.querySelectorAll(".contact-hour-practical").forEach((input) => {
    currentPractical += Number(input.value) || 0;
  });

  const theoryTotalCell = document.getElementById("theory_hours_total");
  if (theoryTotalCell) {
    const max = Number(theoryTotalCell.dataset.max);
    theoryTotalCell.textContent = `${currentTheory} / ${max}`;
    theoryTotalCell.style.color = currentTheory > max ? "red" : "black";
  }

  const practicalTotalCell = document.getElementById("practical_hours_total");
  if (practicalTotalCell) {
    const max = Number(practicalTotalCell.dataset.max);
    practicalTotalCell.textContent = `${currentPractical} / ${max}`;
    practicalTotalCell.style.color = currentPractical > max ? "red" : "black";
  }
}

function generateMappingTable() {
  const closInput = document.getElementById("clos");
  if (!closInput) return;

  const closText = closInput.value;

  // Use regex to safely split by newline, handling all OS line break types (\r\n, \n, or \r)
  const closList = closText
    .split(/\r?\n|\r/)
    .map((c) => c.trim())
    .filter((c) => c !== "");
  const tbody = document.getElementById("mappingBody");
  if (!tbody) return;

  const numPOsInput = document.getElementById("numPOs");
  const numPSOsInput = document.getElementById("numPSOs");
  let numPOs =
    numPOsInput && numPOsInput.value !== "" ? parseInt(numPOsInput.value) : 11;
  let numPSOs =
    numPSOsInput && numPSOsInput.value !== ""
      ? parseInt(numPSOsInput.value)
      : 2;

  if (numPOs < 8) {
    numPOs = 8;
    if (numPOsInput) numPOsInput.value = 8;
  }
  if (numPOs > 12) {
    numPOs = 12;
    if (numPOsInput) numPOsInput.value = 12;
  }
  if (numPSOs < 0) {
    numPSOs = 0;
    if (numPSOsInput) numPSOsInput.value = 0;
  }
  if (numPSOs > 4) {
    numPSOs = 4;
    if (numPSOsInput) numPSOsInput.value = 4;
  }

  const thead = document.getElementById("mappingHead");
  if (thead) {
    let headHtml = `
      <tr>
        <td colspan="${1 + numPOs + numPSOs}" style="background-color: #fff3cd; padding: 10px; font-size: 14px; color: #856404; text-align: left; border: 1px solid #ffeeba; border-bottom: none;">
          <strong>📝 Note:</strong> Enter mapping values (3 for Strong, 2 for Medium, 1 for Weak) in the table below. The rows will sync with the CLOs you enter in Part A.
        </td>
      </tr>
      <tr class="section-title"><td>CLOs</td>
    `;
    for (let i = 1; i <= numPOs; i++) headHtml += `<td>PO${i}</td>`;
    for (let i = 1; i <= numPSOs; i++) headHtml += `<td>PSO${i}</td>`;
    headHtml += "</tr>";
    thead.innerHTML = headHtml;
  }

  // Save existing input values to prevent data loss while typing
  const existingData = [];
  const existingRows = tbody.querySelectorAll("tr");
  existingRows.forEach((row) => {
    const inputs = row.querySelectorAll("input");
    if (inputs.length > 0) {
      // Only save rows that actually contain input fields
      const rowData = {};
      inputs.forEach((input) => {
        rowData[input.name] = input.value;
      });
      existingData.push(rowData);
    }
  });

  tbody.innerHTML = ""; // Clear existing rows

  if (closList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${1 + numPOs + numPSOs}" style="text-align: center; padding: 10px; font-weight: bold; color: #666;">Enter CLOs in the box above to generate the mapping table.</td></tr>`;
    return;
  }

  closList.forEach((clo, index) => {
    const row = document.createElement("tr");
    let rowHtml = `<td><input type="text" name="mapCO[]" value="CLO${index + 1}" readonly style="width: 100%; font-weight: bold; background-color: transparent; border: none; outline: none; cursor: default;" title="${clo.replace(/"/g, "&quot;")}"></td>`;

    // Generate PO1 to numPOs columns
    for (let i = 1; i <= numPOs; i++) {
      const fieldName = `mapPO${i}[]`;
      const prevValue =
        existingData[index] && existingData[index][fieldName]
          ? existingData[index][fieldName]
          : "";
      rowHtml += `<td><input type="text" name="${fieldName}" value="${prevValue}" style="text-align: center; width: 100%; border: 1px solid #ccc; box-sizing: border-box;" maxlength="1" pattern="[1-3]" title="Enter 3 (Strong), 2 (Medium), or 1 (Weak)" oninput="this.value=this.value.replace(/[^1-3]/g,'')"></td>`;
    }

    // Generate PSO1 to numPSOs columns
    for (let i = 1; i <= numPSOs; i++) {
      const fieldName = `mapPSO${i}[]`;
      const prevValue =
        existingData[index] && existingData[index][fieldName]
          ? existingData[index][fieldName]
          : "";
      rowHtml += `<td><input type="text" name="${fieldName}" value="${prevValue}" style="text-align: center; width: 100%; border: 1px solid #ccc; box-sizing: border-box;" maxlength="1" pattern="[1-3]" title="Enter 3 (Strong), 2 (Medium), or 1 (Weak)" oninput="this.value=this.value.replace(/[^1-3]/g,'')"></td>`;
    }

    row.innerHTML = rowHtml;
    tbody.appendChild(row);
  });
}

// Call on DOM load to ensure the empty state or pre-filled data renders the table correctly
document.addEventListener("DOMContentLoaded", () => {
  const numPOsInput = document.getElementById("numPOs");
  const numPSOsInput = document.getElementById("numPSOs");
  const closInput = document.getElementById("clos");

  // Ensure input events trigger table regeneration if typing occurs
  if (closInput) closInput.addEventListener("input", generateMappingTable);
  if (numPOsInput) numPOsInput.addEventListener("input", generateMappingTable);
  if (numPSOsInput)
    numPSOsInput.addEventListener("input", generateMappingTable);

  function enforceLocking() {
    if (!numPOsInput || !numPSOsInput) return;

    let isPool = false;
    const poolHidden = document.querySelector('input[name="is_pool_course"]');
    if (poolHidden) {
      isPool = poolHidden.value === "true";
    }

    const setLocked = (el, locked) => {
      if (!el) return;
      // Prevent hiding a large wrapper container (like the whole form). Target the specific small parent div.
      let container = el;
      if (
        el.parentElement &&
        el.parentElement.tagName === "DIV" &&
        el.parentElement.children.length <= 3
      ) {
        container = el.parentElement;
      }
      if (locked) {
        el.setAttribute("readonly", "readonly");
        container.style.display = "none";
      } else {
        el.removeAttribute("readonly");
        container.style.display = "";
      }
    };

    setLocked(numPOsInput, !isPool);
    setLocked(numPSOsInput, !isPool);
  }

  // Run on load
  enforceLocking();

  // If there's a dropdown that changes the program, re-evaluate
  const owningEl =
    document.getElementById("owning_program_code") ||
    document.querySelector('[name="owning_program_code"]') ||
    document.getElementById("owning_program") ||
    document.querySelector('[name="owning_program"]');
  if (owningEl) {
    owningEl.addEventListener("change", async () => {
      const val = (owningEl.value || owningEl.textContent || "").trim();
      if (
        val &&
        !val.includes("From University Pool") &&
        val !== "Unassigned"
      ) {
        try {
          const response = await fetch(
            "/api/program/" + encodeURIComponent(val),
          );
          const data = await response.json();
          if (data.exists) {
            if (numPOsInput) numPOsInput.value = data.program.num_pos || 11;
            if (numPSOsInput)
              numPSOsInput.value =
                data.program.num_psos !== null ? data.program.num_psos : 2;
          }
        } catch (e) {
          console.error("Error fetching program PO/PSO sizes:", e);
        }
      }
      enforceLocking();
      generateMappingTable();
    });
  }

  generateMappingTable();
});

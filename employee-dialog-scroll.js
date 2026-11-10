// Keep the employee add/edit dialog's previous background scrolling behavior.
// Attendance dialogs continue to lock the page while they are open.
const employeeDialogScrollStyle = document.createElement('style');
employeeDialogScrollStyle.textContent = `
  body:has(.employee-dialog[open]) {
    overflow: auto !important;
  }
  body:has(.attendance-dialog[open]) {
    overflow: hidden !important;
  }
`;
document.head.append(employeeDialogScrollStyle);

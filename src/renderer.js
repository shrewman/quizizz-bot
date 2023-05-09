let $ = document.querySelector.bind(document);

const answersTable = $('#question-answer-table');
const roomCodeInput = $('#room-code-input');

function fillTable(answers) {
  for (let card of answers) {
    const newRow = answersTable.insertRow();
    const questionCell = newRow.insertCell(0);
    const answerCell = newRow.insertCell(1);

    questionCell.innerHTML = card.question;
    answerCell.innerHTML = card.answer.join('\n');
  }
}

function clearTable() {
  while (answersTable.rows.length > 1) {
    answersTable.deleteRow(1);
  }
}


$("#get-answers-btn").addEventListener("click", async () => {
  try {
    const roomCode = roomCodeInput.value;
    console.log(roomCode);
    const answers = await api.getAnswers(roomCode);
    clearTable();
    fillTable(answers);
  } catch (e) {
    api.showErrorBox('Error', e.message/*.split(' ').slice(6).join(' ')*/);
  }
}); 
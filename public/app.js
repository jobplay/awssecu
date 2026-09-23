const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

let questions = [];
let progress = null;
let view = "home";
let mode = null;
let selected = new Set();
let revealed = false;
let saveTimer;

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
const stat = (id) => progress.stats[id] || { wrong: 0, attempts: 0, correct: 0 };
const currentSession = () => progress.sessions[mode];
const currentQuestion = () => questions.find(({ id }) => id === currentSession().queue[currentSession().cursor]);

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

async function persist(immediate = false) {
  clearTimeout(saveTimer);
  const save = async () => {
    try {
      const response = await fetch("/api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(progress) });
      if (!response.ok) throw new Error();
    } catch { notify("저장하지 못했습니다. 연결을 확인해 주세요."); }
  };
  if (immediate) return save();
  saveTimer = setTimeout(save, 150);
}

function startMode(nextMode, restart = false) {
  mode = nextMode;
  const existing = progress.sessions[mode];
  if (existing && !restart && existing.cursor < existing.queue.length) {
    selected = new Set(existing.selected || []);
    revealed = Boolean(existing.revealed);
    view = "quiz";
    return render();
  }
  const queue = mode === "full"
    ? questions.map(({ id }) => id)
    : questions.filter(({ id }) => stat(id).wrong > 0).sort((a, b) => stat(b.id).wrong - stat(a.id).wrong || a.id - b.id).map(({ id }) => id);
  if (!queue.length) return notify("아직 틀린 문제가 없습니다.");
  progress.sessions[mode] = { queue, cursor: 0, selected: [], revealed: false, correctCount: 0, startedAt: new Date().toISOString() };
  selected = new Set();
  revealed = false;
  view = "quiz";
  persist();
  render();
}

function home() {
  view = "home";
  mode = null;
  render();
}

function selectOption(id) {
  if (revealed) return;
  const question = currentQuestion();
  if (question.answers.length === 1) selected = new Set([id]);
  else if (selected.has(id)) selected.delete(id);
  else selected.add(id);
  const session = currentSession();
  session.selected = [...selected];
  persist();
  render();
}

function checkAnswer() {
  const question = currentQuestion();
  if (selected.size !== question.answers.length) return notify(`답을 ${question.answers.length}개 선택해 주세요.`);
  const answer = new Set(question.answers);
  const correct = selected.size === answer.size && [...selected].every((id) => answer.has(id));
  const item = stat(question.id);
  item.attempts += 1;
  if (correct) { item.correct += 1; currentSession().correctCount += 1; }
  else item.wrong += 1;
  revealed = true;
  currentSession().revealed = true;
  persist(true);
  render();
}

function nextQuestion() {
  const session = currentSession();
  session.cursor += 1;
  session.selected = [];
  session.revealed = false;
  selected = new Set();
  revealed = false;
  persist(true);
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function resetSession(targetMode) {
  const label = targetMode === "full" ? "전체 문제" : "오답 문제";
  if (!confirm(`${label} 진행상태를 처음으로 되돌릴까요?\n오답 횟수 기록은 유지됩니다.`)) return;
  progress.sessions[targetMode] = null;
  persist(true);
  startMode(targetMode, true);
}

function clearAll() {
  if (!confirm("모든 진행상태와 오답 횟수를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
  fetch("/api/clear", { method: "POST" }).then((response) => response.json()).then((fresh) => {
    progress = fresh;
    notify("모든 학습 기록을 삭제했습니다.");
    home();
  });
}

function header(settings = true) {
  return `<header class="topbar"><div class="brand"><span class="brand-mark">AWS</span><span>Security CBT</span></div>${settings ? '<button class="top-action" data-action="settings" aria-label="설정">설정</button>' : '<button class="top-action" data-action="home">닫기</button>'}</header>`;
}

function renderHome() {
  const attempted = Object.values(progress.stats).filter((item) => item.attempts > 0).length;
  const wrongItems = Object.values(progress.stats).filter((item) => item.wrong > 0);
  const wrongTotal = wrongItems.reduce((sum, item) => sum + item.wrong, 0);
  const full = progress.sessions.full;
  const subtitle = full && full.cursor < full.queue.length ? `${full.cursor + 1}번 위치부터 계속` : "1번부터 256번까지 순서대로";
  app.innerHTML = `<div class="shell">${header()}<section class="hero"><p class="eyebrow">AWS CERTIFIED SECURITY</p><h1>매일 조금씩,<br>합격에 가까워지세요.</h1><p class="hero-copy">답안과 오답 기록은 서버에 자동 저장됩니다.</p></section><main class="dashboard"><div class="stat-grid"><div class="stat"><strong>${attempted}</strong><span>풀어본 문제</span></div><div class="stat"><strong>${wrongItems.length}</strong><span>오답 문제</span></div><div class="stat"><strong>${wrongTotal}</strong><span>누적 오답</span></div></div><h2 class="section-title">학습 모드</h2><button class="mode-card" data-mode="full"><span class="mode-icon">256</span><span class="mode-copy"><strong>전체 문제 풀기</strong><small>${subtitle}</small></span><span class="arrow">›</span></button><button class="mode-card" data-mode="wrong" ${wrongItems.length ? "" : "disabled"}><span class="mode-icon red">↻</span><span class="mode-copy"><strong>틀린 문제 위주로 풀기</strong><small>${wrongItems.length ? `오답 ${wrongItems.length}개 · 많이 틀린 순서` : "문제를 틀리면 자동으로 추가됩니다"}</small></span><span class="arrow">›</span></button><p class="mini-note">브라우저를 닫아도 현재 문제와 선택한 답까지 저장됩니다. 오답 횟수는 문제마다 누적됩니다.</p></main></div>`;
}

function renderQuiz() {
  const session = currentSession();
  if (session.cursor >= session.queue.length) return renderComplete();
  const question = currentQuestion();
  const progressPercent = ((session.cursor + (revealed ? 1 : 0)) / session.queue.length) * 100;
  const answers = new Set(question.answers);
  const isCorrect = revealed && selected.size === answers.size && [...selected].every((id) => answers.has(id));
  const optionHtml = question.options.map((option) => {
    const chosen = selected.has(option.id);
    let className = chosen ? " selected" : "";
    if (revealed && answers.has(option.id)) className = " correct";
    else if (revealed && chosen) className = " wrong";
    return `<button class="option${className}" data-option="${option.id}" ${revealed ? "disabled" : ""}><span class="option-letter">${option.id}</span><span>${escapeHtml(option.text)}</span></button>`;
  }).join("");
  const explanation = revealed ? `<section class="explanation"><p class="result-label ${isCorrect ? "good" : "bad"}">${isCorrect ? "정답입니다" : `오답입니다 · 정답 ${question.answers.join(", ")}`}</p>${escapeHtml(question.explanation)}</section>` : "";
  app.innerHTML = `<div class="shell"><header class="quiz-header"><div class="quiz-row"><button class="icon-button" data-action="home" aria-label="홈으로">‹</button><div class="quiz-meta"><strong>${mode === "full" ? "전체 문제" : "오답 집중"}</strong><small>${session.cursor + 1} / ${session.queue.length}</small></div><span class="wrong-badge">누적 오답 ${stat(question.id).wrong}회</span></div><div class="progress-track"><div class="progress-fill" style="width:${progressPercent}%"></div></div></header><main class="question-wrap"><div class="question-number">QUESTION ${question.id}</div><h1 class="question">${escapeHtml(question.question)}</h1>${question.answers.length > 1 ? `<span class="multi-hint">${question.answers.length}개 선택</span>` : ""}<div>${optionHtml}</div>${explanation}</main><footer class="bottom-bar"><button class="primary" data-action="${revealed ? "next" : "check"}" ${!revealed && !selected.size ? "disabled" : ""}>${revealed ? (session.cursor + 1 === session.queue.length ? "결과 보기" : "다음 문제") : "정답 확인"}</button></footer></div>`;
}

function renderComplete() {
  const session = currentSession();
  const percent = session.queue.length ? Math.round((session.correctCount / session.queue.length) * 100) : 0;
  app.innerHTML = `<div class="shell">${header()}<main class="complete"><div class="complete-icon">✓</div><h2>학습을 완료했습니다</h2><p>${session.queue.length}문제 중 ${session.correctCount}문제를 맞혔습니다.<br>정답률 <strong>${percent}%</strong></p><button class="primary" data-action="home">홈으로 돌아가기</button><button class="secondary" data-action="restart-current">처음부터 다시 풀기</button></main></div>`;
}

function renderSettings() {
  app.innerHTML = `<div class="shell">${header(false)}<main class="settings"><h2>학습 데이터 설정</h2><p>진행상태는 Docker 볼륨에 저장되어 같은 서버에서 다시 접속하면 이어집니다.</p><section class="setting-card"><strong>전체 문제 처음부터</strong><p>전체 문제의 현재 위치만 초기화합니다. 누적 오답 횟수는 남습니다.</p><button class="secondary" data-reset="full">전체 문제 다시 풀기</button></section><section class="setting-card"><strong>오답 문제 처음부터</strong><p>현재 오답 세션을 새로 만들고, 많이 틀린 문제부터 다시 풉니다.</p><button class="secondary" data-reset="wrong">오답 문제 다시 풀기</button></section><section class="setting-card"><strong>모든 학습 기록 삭제</strong><p>진행 위치, 답안, 오답 횟수를 모두 삭제합니다.</p><button class="secondary danger" data-action="clear">모든 기록 삭제</button></section></main></div>`;
}

function render() {
  if (view === "home") renderHome();
  else if (view === "quiz") renderQuiz();
  else renderSettings();
}

app.addEventListener("click", (event) => {
  const option = event.target.closest("[data-option]");
  if (option) return selectOption(option.dataset.option);
  const modeButton = event.target.closest("[data-mode]");
  if (modeButton) return startMode(modeButton.dataset.mode);
  const reset = event.target.closest("[data-reset]");
  if (reset) return resetSession(reset.dataset.reset);
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "home") home();
  if (action === "settings") { view = "settings"; render(); }
  if (action === "check") checkAnswer();
  if (action === "next") nextQuestion();
  if (action === "clear") clearAll();
  if (action === "restart-current") resetSession(mode);
});

Promise.all([fetch("/api/questions").then((r) => r.json()), fetch("/api/progress").then((r) => r.json())])
  .then(([loadedQuestions, loadedProgress]) => { questions = loadedQuestions; progress = loadedProgress; render(); })
  .catch(() => { app.innerHTML = '<main class="loading"><p>문제집을 불러오지 못했습니다.<br>서버를 다시 시작해 주세요.</p></main>'; });

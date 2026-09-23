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
const serviceGlossary = [
  ["IAM", ["IAM", "Identity and Access Management"], "AWS 리소스에 누가 어떤 작업을 할 수 있는지 사용자, 역할, 정책으로 제어하는 접근 관리 서비스입니다."],
  ["IAM Identity Center", ["IAM Identity Center", "AWS Single Sign-On", "AWS SSO"], "여러 AWS 계정과 애플리케이션의 사용자 로그인을 한곳에서 관리하는 통합 인증 서비스입니다."],
  ["STS", ["AWS STS", "STS"], "역할 전환 등에 사용하는 유효기간이 짧은 임시 보안 자격 증명을 발급합니다."],
  ["AWS Organizations", ["AWS Organizations", "AWS Organization", "Organizations"], "여러 AWS 계정을 조직 단위로 묶고 결제와 정책을 중앙 관리합니다."],
  ["SCP", ["SCP", "Service Control Policy"], "조직 내 계정이 가질 수 있는 권한의 최대 범위를 제한하는 AWS Organizations 정책입니다."],
  ["Control Tower", ["AWS Control Tower", "Control Tower"], "여러 계정으로 구성된 AWS 환경을 모범 사례에 맞게 만들고 거버넌스를 적용합니다."],
  ["EC2", ["Amazon EC2", "EC2"], "클라우드에서 가상 서버 인스턴스를 생성하고 실행하는 컴퓨팅 서비스입니다."],
  ["Lambda", ["AWS Lambda", "Lambda"], "서버를 직접 관리하지 않고 이벤트에 따라 코드를 실행하는 서버리스 컴퓨팅 서비스입니다."],
  ["ECS", ["Amazon ECS", "ECS"], "Docker 컨테이너를 배포하고 운영하는 AWS의 관리형 컨테이너 오케스트레이션 서비스입니다."],
  ["EKS", ["Amazon EKS", "EKS"], "Kubernetes 클러스터의 제어 영역을 AWS가 관리해 주는 서비스입니다."],
  ["Fargate", ["AWS Fargate", "Fargate"], "EC2 서버를 직접 관리하지 않고 ECS 또는 EKS 컨테이너를 실행하는 컴퓨팅 엔진입니다."],
  ["ECR", ["Amazon ECR", "ECR"], "컨테이너 이미지를 저장하고 취약점을 검사할 수 있는 관리형 이미지 레지스트리입니다."],
  ["S3", ["Amazon S3", "AWS S3", "S3"], "파일과 백업 같은 객체 데이터를 버킷에 저장하는 확장형 객체 스토리지 서비스입니다."],
  ["S3 Glacier", ["Amazon S3 Glacier", "S3 Glacier", "Glacier"], "자주 사용하지 않는 데이터를 낮은 비용으로 장기 보관하는 S3 아카이브 스토리지 클래스입니다."],
  ["EBS", ["Amazon EBS", "EBS"], "EC2 인스턴스에 연결해 사용하는 영구 블록 스토리지 볼륨입니다."],
  ["EFS", ["Amazon EFS", "EFS"], "여러 컴퓨팅 리소스에서 동시에 마운트할 수 있는 관리형 파일 시스템입니다."],
  ["AWS Backup", ["AWS Backup"], "여러 AWS 서비스의 백업 계획, 보존 기간 및 복구를 중앙 관리합니다."],
  ["DLM", ["Data Lifecycle Manager", "DLM"], "EBS 스냅샷과 EBS 기반 AMI의 생성·보존·삭제 주기를 자동화합니다."],
  ["VPC", ["Amazon VPC", "AWS VPC", "VPC"], "AWS 리소스를 배치할 논리적으로 격리된 가상 네트워크를 제공합니다."],
  ["NACL", ["Network ACL", "NACL"], "서브넷 경계에서 인바운드·아웃바운드 트래픽을 허용하거나 거부하는 무상태 방화벽입니다."],
  ["Security Group", ["Security Group", "보안 그룹"], "EC2 같은 리소스 단위에서 허용 규칙으로 트래픽을 제어하는 상태 저장 방화벽입니다."],
  ["Route 53", ["Amazon Route 53", "Route 53"], "도메인 등록, DNS 조회 및 상태 확인 기반 트래픽 라우팅을 제공하는 DNS 서비스입니다."],
  ["CloudFront", ["Amazon CloudFront", "CloudFront"], "전 세계 엣지 로케이션에서 콘텐츠를 빠르고 안전하게 전송하는 CDN 서비스입니다."],
  ["API Gateway", ["Amazon API Gateway", "AWS API Gateway", "API Gateway"], "REST, HTTP 및 WebSocket API를 생성·보호·모니터링하는 관리형 서비스입니다."],
  ["Direct Connect", ["AWS Direct Connect", "Direct Connect"], "온프레미스와 AWS를 인터넷을 거치지 않는 전용 네트워크 회선으로 연결합니다."],
  ["PrivateLink", ["AWS PrivateLink", "PrivateLink"], "VPC 엔드포인트를 통해 서비스를 퍼블릭 인터넷 노출 없이 비공개로 연결합니다."],
  ["Transit Gateway", ["AWS Transit Gateway", "Transit Gateway"], "여러 VPC와 온프레미스 네트워크를 허브 방식으로 연결하는 네트워크 게이트웨이입니다."],
  ["AWS VPN", ["AWS Client VPN", "AWS Site-to-Site VPN", "AWS VPN"], "암호화된 터널을 이용해 사용자 또는 온프레미스 네트워크를 AWS에 연결합니다."],
  ["Network Firewall", ["AWS Network Firewall", "Network Firewall"], "VPC 트래픽을 상태 기반 규칙과 침입 방지 규칙으로 검사하는 관리형 방화벽입니다."],
  ["WAF", ["AWS WAF", "WAF"], "SQL 삽입이나 크로스 사이트 스크립팅 같은 웹 공격을 규칙으로 차단하는 웹 방화벽입니다."],
  ["Shield Advanced", ["AWS Shield Advanced", "Shield Advanced"], "정교한 DDoS 탐지·완화와 비용 보호, 대응 지원을 제공하는 유료 DDoS 보호 서비스입니다."],
  ["Firewall Manager", ["AWS Firewall Manager", "Firewall Manager"], "여러 계정과 리소스의 WAF, 보안 그룹 및 네트워크 방화벽 정책을 중앙 배포합니다."],
  ["CloudTrail", ["AWS CloudTrail", "CloudTrail"], "AWS 계정에서 수행된 API 호출과 사용자 활동을 감사 이벤트로 기록합니다."],
  ["CloudWatch", ["Amazon CloudWatch", "CloudWatch"], "AWS 리소스의 지표, 로그, 경보 및 대시보드를 제공하는 모니터링 서비스입니다."],
  ["AWS Config", ["AWS Config"], "리소스 구성 변경을 기록하고 원하는 규칙을 준수하는지 지속적으로 평가합니다."],
  ["EventBridge", ["Amazon EventBridge", "EventBridge"], "AWS 서비스와 애플리케이션 이벤트를 규칙에 따라 대상 시스템으로 전달하는 이벤트 버스입니다."],
  ["SNS", ["Amazon SNS", "SNS"], "하나의 메시지를 여러 구독자에게 푸시 방식으로 전달하는 게시·구독 메시징 서비스입니다."],
  ["SQS", ["Amazon SQS", "SQS"], "애플리케이션 구성 요소 사이의 메시지를 안전하게 보관하는 관리형 메시지 대기열입니다."],
  ["Kinesis", ["Amazon Kinesis", "Kinesis"], "로그나 클릭스트림 같은 실시간 스트리밍 데이터를 수집하고 처리합니다."],
  ["Step Functions", ["AWS Step Functions", "Step Functions"], "여러 Lambda 함수와 AWS 서비스를 상태 머신 기반 워크플로로 연결합니다."],
  ["CloudFormation", ["AWS CloudFormation", "CloudFormation"], "템플릿을 사용해 AWS 인프라를 코드로 생성하고 변경하는 서비스입니다."],
  ["Systems Manager", ["AWS Systems Manager", "Systems Manager", "SSM"], "서버의 패치, 명령 실행, 세션 접속, 자동화 및 운영 데이터를 중앙 관리합니다."],
  ["KMS", ["AWS KMS", "KMS"], "암호화 키를 생성·보호하고 키 사용 권한과 감사 기록을 관리합니다."],
  ["CloudHSM", ["AWS CloudHSM", "CloudHSM"], "고객 전용 하드웨어 보안 모듈에서 암호화 키와 암호화 연산을 직접 제어합니다."],
  ["Secrets Manager", ["AWS Secrets Manager", "Secrets Manager"], "데이터베이스 암호와 API 키 같은 비밀 값을 안전하게 저장하고 자동 교체합니다."],
  ["ACM", ["AWS Certificate Manager", "ACM"], "AWS 서비스에서 사용할 TLS 인증서를 발급, 배포 및 자동 갱신합니다."],
  ["Cognito", ["Amazon Cognito", "Cognito"], "웹·모바일 앱의 사용자 가입, 로그인 및 임시 AWS 자격 증명 발급을 지원합니다."],
  ["GuardDuty", ["Amazon GuardDuty", "AWS GuardDuty", "GuardDuty"], "로그와 위협 인텔리전스를 분석해 계정·워크로드의 의심스러운 활동을 탐지합니다."],
  ["Security Hub", ["AWS Security Hub", "Security Hub"], "여러 보안 서비스의 탐지 결과와 보안 표준 준수 상태를 한곳에 통합합니다."],
  ["Inspector", ["Amazon Inspector", "Inspector"], "EC2, 컨테이너 이미지, Lambda의 소프트웨어 취약점과 네트워크 노출을 자동 평가합니다."],
  ["Macie", ["Amazon Macie", "Macie"], "머신러닝과 패턴 검사를 사용해 S3의 민감 데이터를 발견하고 보호합니다."],
  ["Detective", ["Amazon Detective", "Detective"], "보안 이벤트 간 관계를 분석해 의심스러운 활동의 근본 원인을 조사하도록 돕습니다."],
  ["Audit Manager", ["AWS Audit Manager", "Audit Manager"], "규정 준수 감사에 필요한 증거를 자동 수집하고 평가 보고서로 정리합니다."],
  ["RDS", ["Amazon RDS", "RDS"], "관계형 데이터베이스의 설치, 백업, 패치 및 고가용성을 관리해 주는 서비스입니다."],
  ["DynamoDB", ["Amazon DynamoDB", "DynamoDB"], "일관된 낮은 지연시간을 제공하는 완전관리형 서버리스 NoSQL 데이터베이스입니다."],
  ["Redshift", ["Amazon Redshift", "Redshift"], "대규모 분석 쿼리를 위한 관리형 클라우드 데이터 웨어하우스입니다."],
  ["OpenSearch", ["Amazon OpenSearch Service", "OpenSearch"], "검색, 로그 분석 및 관찰성 워크로드를 위한 관리형 검색·분석 서비스입니다."],
  ["Athena", ["Amazon Athena", "Athena"], "서버를 관리하지 않고 표준 SQL로 S3 데이터를 직접 조회합니다."],
  ["QuickSight", ["Amazon QuickSight", "QuickSight"], "데이터를 대시보드와 시각화로 분석·공유하는 비즈니스 인텔리전스 서비스입니다."],
  ["RAM", ["AWS Resource Access Manager", "AWS RAM", "Resource Access Manager"], "서브넷이나 Transit Gateway 같은 지원 리소스를 여러 AWS 계정과 안전하게 공유합니다."],
  ["Service Catalog", ["AWS Service Catalog", "Service Catalog"], "조직이 승인한 AWS 제품과 인프라 템플릿을 사용자가 정해진 방식으로 배포하게 합니다."],
];

function glossaryFor(question) {
  const source = [question.question, question.explanation, ...question.options.map(({ text }) => text)].join(" ");
  return serviceGlossary.filter(([, aliases]) => aliases.some((alias) => source.includes(alias)));
}

function glossaryHtml(question) {
  const terms = glossaryFor(question);
  if (!terms.length) return "";
  return `<details class="glossary" open><summary>AWS 서비스 용어 <span>${terms.length}</span></summary><div class="glossary-list">${terms.map(([name, , description]) => `<div class="glossary-item"><strong>${escapeHtml(name)}</strong><p>${escapeHtml(description)}</p></div>`).join("")}</div></details>`;
}
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
  const explanation = revealed ? `<section class="explanation"><p class="result-label ${isCorrect ? "good" : "bad"}">${isCorrect ? "정답입니다" : `오답입니다 · 정답 ${question.answers.join(", ")}`}</p>${escapeHtml(question.explanation)}</section>${glossaryHtml(question)}` : "";
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

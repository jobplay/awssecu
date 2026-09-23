# AWS Security Specialty 모바일 CBT

PDF의 256문제를 모바일에서 풀 수 있는 단일 사용자용 CBT 웹앱입니다.

## 실행

```bash
docker compose up -d --build
```

브라우저에서 `http://localhost:3080`에 접속합니다. 같은 Wi-Fi의 모바일 기기에서는 `http://컴퓨터의-IP:3080`으로 접속할 수 있습니다.

다른 포트를 사용하려면 PowerShell에서 `$env:CBT_PORT='원하는 포트'`를 먼저 설정하고 실행합니다.

진행 위치, 현재 선택 답안, 정답/오답 횟수는 `cbt-data` Docker 볼륨에 자동 저장됩니다. 컨테이너를 재생성해도 볼륨을 삭제하지 않는 한 기록이 유지됩니다.

## 주요 기능

- 1~256번 전체 문제 순차 풀이 및 이어 풀기
- 기존 오답만 모아 많이 틀린 순서로 다시 풀기
- 문제별 누적 오답 횟수 표시
- 단일/복수 정답 지원과 즉시 해설
- 해설과 함께 문제에 등장한 AWS 서비스 용어 설명 제공
- 전체/오답 진행상태만 처음부터 재시작
- 모든 학습 기록 초기화

## 데이터 재추출

원본 PDF 경로가 바뀌면 `scripts/extract_questions.py`의 `SOURCE`를 수정한 뒤 `pdfplumber`가 설치된 Python으로 실행합니다.

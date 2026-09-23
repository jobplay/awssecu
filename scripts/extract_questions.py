import json
import re
from pathlib import Path

import pdfplumber


SOURCE = Path(r"C:\Users\User\Downloads\AWS_Security_Specialty_한글문제집_1-256.pdf")
OUTPUT = Path("data/questions.json")


def clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ").replace("\r", "")
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r" *\n *", "\n", value)
    return value.strip()


def main() -> None:
    pages = []
    with pdfplumber.open(SOURCE) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            lines = [
                line
                for line in text.splitlines()
                if not re.match(r"^AWS Certified Security.*\d+$", line.strip())
                and line.strip() != "한글문제집"
                and not line.startswith("문제 → 정답 → 해설이 바로 이어지도록")
                and not line.startswith("재번호화했습니다.")
            ]
            pages.append("\n".join(lines))

    text = "\n".join(pages)
    markers = list(re.finditer(r"(?m)^문제\s+(\d+)\s*$", text))
    questions = []

    for index, marker in enumerate(markers):
        number = int(marker.group(1))
        end = markers[index + 1].start() if index + 1 < len(markers) else len(text)
        block = text[marker.end() : end].strip()

        answer_match = re.search(r"(?m)^정답:\s*(.+?)\s*$", block)
        explanation_match = re.search(r"(?m)^해설:\s*", block)
        if not answer_match or not explanation_match:
            raise ValueError(f"문제 {number}: 정답 또는 해설을 찾지 못했습니다.")

        prompt_and_options = block[: answer_match.start()].strip()
        raw_option_matches = list(re.finditer(r"(?m)^\(([A-F])\)\s*", prompt_and_options))
        option_matches = []
        expected = ord("A")
        for candidate in raw_option_matches:
            if candidate.group(1) == chr(expected):
                option_matches.append(candidate)
                expected += 1
            elif option_matches:
                # 보기 본문 안의 "(A), (B), (C) 모두" 같은 참조는 새 보기로 보지 않습니다.
                break
        if len(option_matches) < 2:
            raise ValueError(f"문제 {number}: 보기가 {len(option_matches)}개입니다.")

        prompt = clean_text(prompt_and_options[: option_matches[0].start()]).replace("\n", " ")
        options = []
        for option_index, option_match in enumerate(option_matches):
            option_end = (
                option_matches[option_index + 1].start()
                if option_index + 1 < len(option_matches)
                else len(prompt_and_options)
            )
            options.append(
                {
                    "id": option_match.group(1),
                    "text": clean_text(prompt_and_options[option_match.end() : option_end]).replace("\n", " "),
                }
            )

        answer_text = answer_match.group(1)
        answers = re.findall(r"[A-F]", answer_text)
        explanation = clean_text(block[explanation_match.end() :]).replace("\n", " ")
        questions.append(
            {
                "id": number,
                "question": prompt,
                "options": options,
                "answers": answers,
                "explanation": explanation,
            }
        )

    ids = [question["id"] for question in questions]
    if ids != list(range(1, 257)):
        raise ValueError(f"문제 번호가 1~256 연속이 아닙니다: {ids[:5]} ... {ids[-5:]}")
    for question in questions:
        option_ids = {option["id"] for option in question["options"]}
        if not question["answers"] or not set(question["answers"]).issubset(option_ids):
            raise ValueError(f"문제 {question['id']}: 정답이 보기 범위와 맞지 않습니다.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    multiple = sum(len(question["answers"]) > 1 for question in questions)
    print(f"추출 완료: {len(questions)}문제, 복수 정답 {multiple}문제 -> {OUTPUT}")


if __name__ == "__main__":
    main()

---
title:
type: SRS
version: v0.1
status: draft
date:
tags: []
related: []
---

# SRS — {{서비스명}}

> PRD의 "무엇을"을 "어떻게"로 변환하는 기술 명세서.

## 1. 시스템 개요

**서비스 설명**: (한 문장)

**기술 스택**:
- Frontend:
- Backend:
- DB:
- 배포:

---

## 2. 기능 요구사항 (Functional Requirements)

### FR-01: {{기능명}}
- 입력:
- 처리:
- 출력:
- 예외 처리:

### FR-02: {{기능명}}
- 입력:
- 처리:
- 출력:

---

## 3. 비기능 요구사항 (Non-Functional Requirements)

| 항목 | 요구사항 |
|---|---|
| 응답 시간 | API 95th percentile < 500ms |
| 가용성 | 99% uptime (MVP 기준) |
| 보안 | RLS 적용, env var 분리 |
| 확장성 | |

---

## 4. 데이터 모델

### 테이블: {{table_name}}

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | gen_random_uuid() |
| created_at | timestamptz | NOT NULL | now() |
| | | | |

---

## 5. API 엔드포인트 목록

| Method | Path | 설명 | Auth |
|---|---|---|---|
| GET | /api/{{resource}}/ | 목록 조회 | 선택 |
| POST | /api/{{resource}}/ | 생성 | 필요 |
| GET | /api/{{resource}}/{id} | 단건 조회 | 선택 |
| PUT | /api/{{resource}}/{id} | 수정 | 필요 |
| DELETE | /api/{{resource}}/{id} | 삭제 | 필요 |

---

## 6. 화면 목록

| 화면 | 경로 | 설명 |
|---|---|---|
| 홈 / 랜딩 | / | |
| | | |

---

## 관련 문서

- [[PRD]]
- [[api_contracts]]
- [[db_schema]]

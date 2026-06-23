---
title: SRS — GEUMTAE Export
type: SRS
version: v1.0
status: confirmed
date: 2026-06-21
tags: [geumtae, srs, backend, api]
related: [PRD, api_contracts, db_schema]
---

# SRS — GEUMTAE Export (금태 프리미엄 수출 서비스)

> PRD의 "무엇을"을 "어떻게"로 변환하는 기술 명세서.
> 기반: ISO/IEC/IEEE 29148:2018

## 1. 시스템 개요

**서비스 설명**: 한국산 금태 B2B 수출 운영 관리 — 발주~납품~통관~CS~클레임 전 워크플로우 단일 시스템.

**기술 스택**:

| 레이어 | 선택 | 이유 |
|---|---|---|
| Frontend | Next.js (React) | 운영 대시보드 + 바이어 추적 링크 페이지 |
| Backend | FastAPI (Python) | 단일 개발자 운영, 비동기 IoT 처리 적합 |
| DB | PostgreSQL (Supabase) | 관계형 데이터(발주/납품/클레임), RLS 지원 |
| IoT | AWS IoT Core (MQTT) | 저전력 온도 센서 실시간 수집 |
| 배포 | Railway (Backend) / Vercel (Frontend) | 소규모 팀 인프라 부담 최소화 |

**외부 API**:

| API | 용도 |
|---|---|
| LINE Messaging API | 바이어 CS 전담 채널 + 발주 확인 자동 발송 |
| DHL/FedEx/EMS | 물류 추적 URL 생성 |
| UNI-PASS EDI (관세청) | 수출 신고 자동화 |
| 환율 API (수출입은행) | 청구서 엔/달러 환산 |

---

## 2. 기능 요구사항 (Functional Requirements)

### SRS-F-001: HACCP 서류 패키지 자동 첨부
- **원본 FR**: FR-001
- **입력**: 발주 확정 이벤트 (orderId)
- **처리**: HACCP 인증서 사본 + 위생증명서 PDF 자동 생성, 납품 Document Set에 연결
- **출력**: 납품 건마다 서류 다운로드 링크 바이어에게 LINE 자동 발송
- **예외**: PDF 생성 실패 시 담당자 즉시 알림, 수동 업로드 폴백

### SRS-F-002: 납기 SLA 자동 판정
- **원본 FR**: FR-002
- **입력**: 납품 도착 확정 시각 (actualDeliveryAt), 약정 도착일 (promisedDeliveryDate)
- **처리**: `actualDeliveryAt > promisedDeliveryDate + 1day` → SlaViolation 레코드 생성, 보상 금액 산정
- **출력**: SLA 위반 시 PO에게 알림 + 클레임 처리 워크플로우 자동 개시
- **예외**: 천재지변(태풍·지진) 면책 코드 수동 입력 가능

### SRS-F-003: 온도 이탈 감지 및 알림
- **원본 FR**: FR-003
- **입력**: MQTT 토픽 `shipment/{shipmentId}/sensor` 수신 메시지 (temp, ts)
- **처리**: 3회 연속 temp > 5°C → TemperatureAlert 생성. 스파이크(1회 이탈) 필터 적용
- **출력**: 담당자 LINE/SMS 즉시 알림. 알림 후 미해결 30분 → PO 에스컬레이션
- **예외**: 센서 연결 끊김 → 15분 후 "신호 없음" 알림. 재연결 시 자동 재개

### SRS-F-004: 물류 추적 링크 자동 발송
- **원본 FR**: FR-004
- **입력**: 발주 확정 이벤트 (orderId, carrier, trackingNumber)
- **처리**: 캐리어 API 연동 → 추적 URL 생성 → LINE으로 바이어 자동 발송 (30분 이내)
- **출력**: 바이어 LINE 메시지: "발주 #{orderId} 출발 완료. 실시간 추적: {trackingUrl}"
- **예외**: 캐리어 API 타임아웃 → 폴백 추적 URL(캐리어 공식 사이트) 제공. 3회 재시도 후 수동 발송 큐

### SRS-F-005: 통관 서류 체크리스트 관리
- **원본 FR**: FR-005
- **입력**: 출하 등록 이벤트 (shipmentId)
- **처리**: DocumentType별 체크리스트 자동 생성. 미완료 서류 있으면 담당자 알림
- **출력**: 서류 완료 시 UNI-PASS EDI 자동 전송. EDI 수신 확인 번호 저장
- **예외**: EDI 거부 → 오류 코드 담당자 알림 + 3회 재시도 (지수 백오프)

### SRS-F-006: 클레임 상태 관리
- **원본 FR**: FR-007
- **입력**: 클레임 접수 요청 (shipmentId, reason, reportedAt)
- **처리**: 상태 전이 FSM → RECEIVED → REVIEWING → APPROVED → RESOLVED. 48시간 처리 SLA 타이머 기산
- **출력**: 처리 완료 시 바이어 LINE 알림. 48시간 초과 시 PO 에스컬레이션
- **예외**: 바이어 미응답 시 72시간 후 자동 CLOSED 처리 (감사 로그 보존)

### SRS-F-007: CS 응답 SLA 타이머
- **원본 FR**: FR-006
- **입력**: 바이어 LINE 메시지 수신 시각
- **처리**: 24시간 SLA 타이머 기산. 미응답 20시간 도달 → 담당자 경보
- **출력**: 응답 완료 시 타이머 정지 + 응답 시간 로그 기록
- **예외**: 업무외 시간(22시~07시 JST) 수신 메시지 → 다음 07시부터 기산

---

## 3. 비기능 요구사항 (Non-Functional Requirements)

| ID | 항목 | 요구사항 |
|---|---|---|
| NFR-P1 | 추적 링크 발송 | 발주 확정 후 30분 이내 |
| NFR-P2 | CS 응답 시간 | 24시간 이내 응답률 95% |
| NFR-P3 | 서류 처리 리드타임 | 발주 확정 후 48시간 이내 |
| NFR-P4 | 시스템 가용성 | 월 99.9% 업타임 |
| NFR-S1 | 바이어 정보 보호 | 계약서·결제 정보 AES-256 암호화 저장 |
| NFR-S2 | 접근 제어 | RBAC: CS 담당자 / PO / 물류 파트너 역할 분리 |
| NFR-S3 | IoT 데이터 무결성 | 온도 로그 타임스탬프 + 해시 저장, 위변조 방지 |
| NFR-C1 | HACCP 인증 | 연간 갱신 유지. 기준 이탈 즉시 PO 보고 |
| NFR-C2 | 식품위생법 | 처리·보관·운반 전 과정 기준 이상 유지 |
| NFR-C3 | 일본 수입 식품 규제 | 일본 식품위생법 잔류물·위생 항목 전 납품 충족 |
| NFR-C4 | 수출 신고 보관 | 수출신고필증 5년 보관 (법정 기준) — 협상 불가 |

---

## 4. 데이터 모델

### 테이블: orders

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | gen_random_uuid() |
| buyer_id | uuid | FK(buyers) | 발주 바이어 |
| promised_delivery_date | date | NOT NULL | 약정 도착일 |
| status | text | NOT NULL | DRAFT/CONFIRMED/IN_TRANSIT/DELIVERED/CLOSED |
| sla_deadline | timestamptz | | 약정일 +1일 (자동 산정) |
| created_at | timestamptz | NOT NULL | now() |

### 테이블: shipments

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| order_id | uuid | FK(orders) | |
| departure_date | date | | 출하일 |
| carrier | text | | DHL/FedEx/EMS |
| tracking_number | text | | |
| actual_delivery_at | timestamptz | | 실제 도착 시각 |
| status | text | NOT NULL | PREPARING/DEPARTED/IN_TRANSIT/CUSTOMS_CLEARED/DELIVERED |
| created_at | timestamptz | NOT NULL | now() |

### 테이블: quality_reports

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| shipment_id | uuid | FK(shipments) | |
| weight_kg | numeric(8,3) | NOT NULL | 실제 중량 |
| freshness_grade | text | NOT NULL | A/B/C |
| haccp_lot_number | text | NOT NULL | HACCP 로트번호 |
| water_temp | numeric(4,1) | | 수온 (°C) |
| created_at | timestamptz | NOT NULL | now() |

### 테이블: claims

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| shipment_id | uuid | FK(shipments) | |
| reason | text | NOT NULL | 클레임 사유 |
| status | text | NOT NULL | RECEIVED/REVIEWING/APPROVED/RESOLVED/CLOSED |
| deadline | timestamptz | | 접수일 +48h |
| resolved_at | timestamptz | | 처리 완료 시각 |
| created_at | timestamptz | NOT NULL | now() |

### 테이블: buyers

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK | |
| name | text | NOT NULL | 바이어명 (일본어 지원, UTF-8) |
| line_user_id | text | | LINE 사용자 ID |
| contract_rate | numeric(5,2) | | 계약 단가 ($/kg) |
| created_at | timestamptz | NOT NULL | now() |

---

## 5. API 엔드포인트 목록

| Method | Path | 설명 | Auth |
|---|---|---|---|
| GET | /api/orders/ | 발주 목록 조회 | 필요 |
| POST | /api/orders/ | 발주 생성 | 필요 |
| GET | /api/orders/{id} | 발주 단건 조회 | 필요 |
| PUT | /api/orders/{id}/confirm | 발주 확정 (→ SLA 기산 시작) | 필요 |
| GET | /api/shipments/ | 납품 목록 조회 | 필요 |
| POST | /api/shipments/ | 납품 등록 | 필요 |
| GET | /api/shipments/{id}/tracking | 추적 링크 조회 | 선택 |
| POST | /api/claims/ | 클레임 접수 | 선택 |
| PUT | /api/claims/{id}/status | 클레임 상태 변경 | 필요 |
| GET | /api/documents/{shipment_id} | 서류 목록 조회 | 필요 |
| POST | /api/iot/sensor | IoT 온도 데이터 수신 (MQTT 브리지) | 내부 |
| GET | /api/reports/monthly | 월간 리포트 조회 | 필요 |

---

## 6. 화면 목록

| 화면 | 경로 | 설명 |
|---|---|---|
| 운영 대시보드 | /dashboard | 납품 현황, SLA 준수율, 미처리 클레임 |
| 발주 목록 | /orders | 전체 발주 + 상태 필터 |
| 발주 상세 | /orders/{id} | 납품 이력, 서류, 클레임 연결 |
| 납품 등록 | /shipments/new | 출하 정보 입력 |
| 클레임 관리 | /claims | 미처리 클레임 목록 + 처리 |
| 추적 링크 | /track/{shipmentId} | 바이어 공개 페이지 (인증 불필요) |

---

## 관련 문서

- [[PRD]]
- [[api_contracts]]
- [[db_schema]]

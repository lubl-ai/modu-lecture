# Macro 파이프라인 + TASK 품질 검토 + 4주차 산출물 정리

작성일: 2026-06-21
기반 문서: SRS v1.0, TASK 목록 (day3_tasks.md)

---

## 1. Macro 파이프라인 (전체 도메인 구조)

### 1.1 도메인 분류

GEUMTAE Export 시스템은 6개 핵심 도메인으로 구성된다.

```
[수주관리]  →  [출하관리]  →  [콜드체인/물류]  →  [통관/서류]  →  [고객(바이어) 관리]
                                                                         ↓
                                                               [모니터링/리포팅]
```

### 1.2 도메인별 핵심 Aggregate/Entity

#### 도메인 1: 수주관리 (Order Management)

**역할**: 바이어로부터 발주를 접수하고 출하 지시를 내리는 핵심 도메인.

| Aggregate/Entity | 주요 속성 | 주요 동작 |
|-----------------|---------|---------|
| Order (Aggregate Root) | orderId, buyerId, promisedDeliveryDate, status, slaDeadline | 발주 생성, 확정, SLA 판정 |
| OrderItem | productCode, weightKg, unitPrice | 품목 명세 |
| Buyer | buyerId, name, lineUserId, contractRate | 바이어 계약 정보 |
| SlaViolation | orderId, delayDays, compensationAmount | 위반 보상 산정 |

**상태 전이**: DRAFT → CONFIRMED → IN_TRANSIT → DELIVERED → CLOSED

---

#### 도메인 2: 출하관리 (Shipment Management)

**역할**: 양식장 출하부터 선적까지의 이력을 관리하고 품질 성적서를 발행.

| Aggregate/Entity | 주요 속성 | 주요 동작 |
|-----------------|---------|---------|
| Shipment (Aggregate Root) | shipmentId, orderId, departureDate, carrier, trackingNumber | 납품 이력 관리 |
| QualityReport | shipmentId, weightKg, freshnessGrade, haccpLotNumber, waterTemp | 성적서 발행 |
| WeightCheck | shipmentId, expectedWeightKg, actualWeightKg, variance | 중량 편차 검증 (±5%) |

**상태 전이**: PREPARING → DEPARTED → IN_TRANSIT → CUSTOMS_CLEARED → DELIVERED

---

#### 도메인 3: 콜드체인/물류 (Cold Chain & Logistics)

**역할**: IoT 센서 데이터를 수집하고 온도 이탈을 감지하여 알림을 발송.

| Aggregate/Entity | 주요 속성 | 주요 동작 |
|-----------------|---------|---------|
| SensorReading | shipmentId, temp, humidity, lat, lon, ts, hash | 센서 데이터 수집 및 무결성 검증 |
| TemperatureAlert | alertId, shipmentId, temp, alertedAt, notifyStatus | 이탈 감지 및 알림 |
| TrackingEvent | shipmentId, status, location, updatedAt | 물류 추적 상태 갱신 |
| TrackingLink | shipmentId, carrier, trackingUrl, sentAt | 추적 링크 관리 |

---

#### 도메인 4: 통관/서류 (Customs & Documents)

**역할**: 일본 수입 통관에 필요한 서류를 관리하고 EDI 연동을 처리.

| Aggregate/Entity | 주요 속성 | 주요 동작 |
|-----------------|---------|---------|
| DocumentSet (Aggregate Root) | shipmentId, checklist, status | 서류 체크리스트 관리 |
| Document | documentType, filePath, issuedAt, verifiedAt | 개별 서류 관리 |
| ExportDeclaration | shipmentId, ediStatus, declarationNumber, receivedAt | UNI-PASS EDI 연동 |

**DocumentType**: HACCP_CERT / HEALTH_CERT / ORIGIN_CERT / EXPORT_DECLARATION

---

#### 도메인 5: 고객(바이어) 관리 (Customer Management)

**역할**: 바이어와의 소통, 클레임 처리, 샘플 프로그램을 관리.

| Aggregate/Entity | 주요 속성 | 주요 동작 |
|-----------------|---------|---------|
| Claim (Aggregate Root) | claimId, shipmentId, reason, status, deadline | 클레임 접수·처리 |
| MessageThread | buyerId, messages, lastRepliedAt, slaTimer | CS 대화 이력 관리 |
| SampleRequest | buyerId, requestedAt, shipmentId, feedbackDueDate | 샘플 발송 관리 |
| BuyerFeedback | sampleRequestId, rating, comment, receivedAt | 피드백 수집 |

---

#### 도메인 6: 모니터링/리포팅 (Monitoring & Reporting)

**역할**: 운영 KPI를 집계하고 월간 리포트를 생성.

| Aggregate/Entity | 주요 속성 | 주요 동작 |
|-----------------|---------|---------|
| MonthlyReport | period, totalShipments, slaRate, returnRate | 월간 KPI 집계 |
| BuyerSummary | buyerId, orderCount, totalKg, reorderRate | 바이어별 실적 |
| SystemAlert | alertType, severity, resolvedAt | 운영 이상 감지 |

---

## 2. TASK 품질 검토 (MVP 조정)

### 2.1 TASK 전체 목록 및 MVP 판단

| TASK ID | 기능명 | 난이도 | 비용영향 | MVP 포함? | 조정 이유 |
|---------|--------|--------|---------|----------|----------|
| TASK-C-001 | 발주 생성 API | M | H | Must | 수익 창출 직결, Day 1 필수 |
| TASK-L-001 | SLA 위반 자동 판정 | M | H | Must | 납기 준수율 95% 달성 핵심 |
| TASK-T-001 | SLA 판정 테스트 | L | M | Must | 핵심 비즈니스 로직 검증 |
| TASK-C-002 | 온도 이탈 이벤트 처리 | H | H | Must | 콜드체인 OS=16, 선도 불량 방지 핵심 |
| TASK-L-002 | 온도 이탈 스파이크 필터 | H | M | Must | 오탐 제거 없이 운영 불가 |
| TASK-T-002 | 온도 이탈 감지 테스트 | M | L | Must | 1% 미만 이탈 달성 검증 |
| TASK-C-003 | 추적 링크 생성 API | M | M | Must | 바이어 신뢰 핵심, OS=14 |
| TASK-L-003 | 추적 링크 발송 조율 | M | M | Must | 발주 확정 30분 이내 자동화 |
| TASK-T-003 | 추적 링크 발송 테스트 | L | L | Must | 폴백 처리 검증 필수 |
| TASK-C-004 | 클레임 접수 API | L | M | Must | 교환 보증 PR, 신뢰 구축 |
| TASK-L-004 | 클레임 상태 전이 | M | M | Must | 48시간 처리 SLA 준수 |
| TASK-T-004 | 클레임 전이 테스트 | L | L | Must | 기한 초과 알림 검증 |
| TASK-C-005 | 월간 리포트 API | M | L | 조정 | MVP 3개월 후 필요. 초기엔 수동 집계 가능 |
| TASK-L-005 | 리포트 집계 로직 | M | L | 조정 | 운영 안정화 후 자동화 |
| TASK-T-005 | 리포트 집계 테스트 | L | L | 조정 | 리포트 자동화와 함께 |
| TASK-NFR-001 | AES-256 암호화 | M | M | Must | 계약 정보 보호, 규정 준수 |
| TASK-NFR-002 | RBAC 구현 | M | M | Must | 팀 역할 분리 Day 1 필요 |
| TASK-NFR-003 | IoT 무결성 검증 | H | L | 조정 | MVP 단계 실제 위변조 리스크 낮음. 2차에 구현 |
| TASK-NFR-004 | 5년 보관 정책 | L | L | Must | 법정 요건, 설정값 확인 |
| TASK-NFR-005 | 모니터링 대시보드 | M | L | 조정 | 배포 후 1개월 이내 구성 |

### 2.2 MVP 조정 결과 요약

| 분류 | TASK 수 | 해당 TASK |
|------|--------|----------|
| Must (MVP 필수) | 13 | C-001~004, L-001~004, T-001~004, NFR-001, NFR-002, NFR-004 |
| 조정 (2차 릴리즈) | 7 | C-005, L-005, T-005, NFR-003, NFR-005 + 리포트 자동화 |
| 제외 | 0 | 없음 (전 기능 최소한의 범위로 포함) |

---

## 3. Micro 파이프라인 (콜드체인/물류 도메인 상세)

콜드체인/물류 도메인을 우선 개발 도메인으로 선택한 이유: OS 점수 최고(16점), 선도 불량과 납기 불안 두 핵심 Pain을 동시에 해소하며, 바이어 신뢰의 물리적 기반이 된다.

### 3.1 의존성 기반 실행 순서

```
[Step 1] DB 스키마 생성
  - SensorReading 테이블 생성
  - TemperatureAlert 테이블 생성
  - TrackingEvent 테이블 생성
  - TrackingLink 테이블 생성
  ※ 선행 조건 없음, 최초 실행

[Step 2] IoT 데이터 수집 구현 (TASK-C-002 일부)
  - AWS IoT Core MQTT 브로커 설정
  - MQTT 토픽 구독 구현
  - 센서 데이터 DB 저장 로직
  ※ Step 1 완료 후

[Step 3] 온도 이탈 감지 로직 (TASK-L-002)
  - 스파이크 필터 구현 (3회 연속 판단)
  - AlertEvent 생성 로직
  ※ Step 2 완료 후

[Step 4] 알림 발송 서비스 구현 (TASK-NFR-002 일부)
  - LINE Messaging API 연동
  - SMS 폴백 연동
  - 재시도 로직 (지수 백오프)
  ※ Step 2 완료 후 (Step 3와 병렬 가능)

[Step 5] 추적 링크 생성 API (TASK-C-003)
  - 물류사 API 클라이언트 구현 (DHL/FedEx/EMS)
  - 추적 URL 생성 및 저장
  - 발주 확정 이벤트 리스너
  ※ Step 1 완료, Step 4 완료 후

[Step 6] 물류 상태 갱신 (SRS-F-008)
  - 웹훅 수신 엔드포인트 구현
  - 폴링 스케줄러 구현 (웹훅 미지원 캐리어 대비)
  - 상태 갱신 후 바이어 알림
  ※ Step 5 완료 후

[Step 7] 온도 이탈 테스트 실행 (TASK-T-002)
  - IoT 시뮬레이터로 테스트 데이터 주입
  - Happy/Edge/Failure 케이스 검증
  ※ Step 3, Step 4 완료 후

[Step 8] 추적 링크 발송 테스트 (TASK-T-003)
  - Staging 환경에서 전체 플로우 E2E 테스트
  - 폴백 처리 검증
  ※ Step 6, Step 7 완료 후
```

### 3.2 예상 개발 일정 (백엔드 1인 기준)

| Step | 예상 소요 | 완료 기준 |
|------|----------|----------|
| Step 1 (DB 스키마) | 0.5일 | 마이그레이션 스크립트 실행 완료 |
| Step 2 (MQTT 수집) | 1.5일 | 실제 MQTT 메시지 수신 및 DB 저장 확인 |
| Step 3 (이탈 감지) | 1일 | 스파이크/지속 이탈 분류 로직 유닛 테스트 통과 |
| Step 4 (알림 서비스) | 1일 | LINE 발송 성공 확인, 재시도 로직 검증 |
| Step 5 (추적 링크) | 1.5일 | DHL API 연동, 링크 생성 확인 |
| Step 6 (상태 갱신) | 1일 | 웹훅 수신 및 DB 갱신 확인 |
| Step 7 + 8 (테스트) | 1.5일 | 전체 케이스 통과 |
| **합계** | **8일** | 콜드체인 도메인 MVP 완료 |

---

## 4. 4주차(전체 1~4주차) 산출물 최종 정리

### 4.1 주차별 산출물 요약

| 주차 | 산출물명 | 파일명 | 핵심 내용 1줄 요약 |
|------|---------|-------|-----------------|
| 1주차 | 산업·경쟁 분석 | 01주차_* | Porter's 5F·SWOT·KSF 기반 일본 프리미엄 수산물 시장 진입 가능성 분석 |
| 2주차 | 시장·고객 분석 | 02주차_* | TAM-SAM-SOM·페르소나·CJM·AOS/DOS·JTBD 기반 도쿄 오마카세 바이어 Pain 정량화 |
| 3주차 Day1 | Value Proposition Sheet | day1_vps.md | Pain-Solution/Gain-Product Fit 매핑 및 MVP Feature 우선순위 확정 |
| 3주차 Day2-3 | PRD 초안 (Draft v0.1) | day3_prd_draft.md | 기능 요구사항 FR-001~010 초안, MoSCoW 우선순위 |
| 3주차 Day4 | PRD 최종본 (v1.0) | day4_prd_v1.md | OS 점수 반영 우선순위 확정, 기술 스택 제약·DoD 추가 |
| 4주차 Day1 | SRS 매핑 계획 | day1_srs_mapping.md | PRD→SRS 변환 매핑표 및 AI 에이전트 개발 맥락 SRS 주의사항 |
| 4주차 Day2 | SRS v1.0 | day2_srs_draft.md | ISO 29148 표준 SRS: 이해관계자 요구사항 + SRS-F-001~016 + V&V 매트릭스 |
| 4주차 Day3 | TASK 목록 | day3_tasks.md | Contract→Logic→Test→NFR 4단계 레시피로 추출한 개발 TASK 전체 |
| 4주차 Day4 | Macro/Micro 파이프라인 | day4_macro_pipeline.md | 6개 도메인 구조 + MVP TASK 조정 + 콜드체인 Micro 파이프라인 |

### 4.2 문서 간 추적성 체인

```
VPS (Pain/Gain 정의)
  └─> PRD FR-001~010 (기능 우선순위)
        └─> SRS-F-001~016 (측정 가능한 기능 명세)
              └─> TASK-C-001~005 (API Contract)
                    └─> TASK-L-001~005 (비즈니스 로직)
                          └─> TASK-T-001~005 (테스트 케이스)
                                └─> 구현 코드 → 검증 완료
```

---

## 5. 다음 단계 (5주차 AI 개발 환경 준비)

### 준비사항 1: AI 에이전트 개발 환경 구성

- **필요 작업**: Cursor + Claude Code + GitHub Copilot 설정. `.cursorrules` 파일에 이 프로젝트의 도메인 컨텍스트(DB 스키마, API 규칙, 에러 처리 패턴) 작성
- **기대 효과**: AI 에이전트가 이 SRS와 TASK 문서를 컨텍스트로 참조하여 올바른 방향으로 코드를 생성
- **체크포인트**: TASK-C-001 발주 생성 API를 AI로 생성 후 SRS-F-003 수용 기준과 대조 검증

### 준비사항 2: DB 스키마 확정 및 마이그레이션 준비

- **필요 작업**: PRD에서 제시한 4개 주요 엔티티(Order, Shipment, QualityReport, Claim) 기반으로 PostgreSQL DDL 작성. 관계(FK), 인덱스, 제약 조건 확정
- **기대 효과**: AI가 쿼리를 생성할 때 올바른 테이블 구조를 기반으로 동작
- **체크포인트**: Micro 파이프라인 Step 1 (DB 스키마 생성) 완료 확인

### 준비사항 3: 외부 API 계정 및 테스트 환경 확보

- **필요 작업**: DHL/FedEx/EMS API 개발자 계정 신청, LINE Messaging API 채널 생성, AWS IoT Core 테스트 환경 구성. UNI-PASS EDI 테스트 환경 신청 (관세청 EDI 테스트베드)
- **기대 효과**: TASK-C-003 추적 링크 생성, TASK-C-002 온도 이탈 처리의 실제 통합 테스트 가능
- **체크포인트**: Staging 환경에서 DHL 추적 URL 생성 성공 + IoT 시뮬레이터 MQTT 연결 성공 확인

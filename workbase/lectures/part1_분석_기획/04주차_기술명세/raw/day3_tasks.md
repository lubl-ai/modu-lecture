# 개발 TASK 추출 — 4단계 레시피 (Contract → Logic → Test → NFR)

작성일: 2026-06-21
기반 문서: SRS v1.0 (day2_srs_draft.md)

---

## TASK 추출 원칙

4단계 레시피는 AI 에이전트가 명확한 경계 내에서 구현할 수 있도록 TASK를 분해하는 방법이다.

1. **Contract**: 인터페이스 계약 먼저 정의 (입력/출력/에러 명세)
2. **Logic**: Contract를 충족하는 핵심 비즈니스 로직 구현
3. **Test**: Logic의 Happy Path + Edge + Failure 케이스 검증
4. **NFR**: 성능·보안·모니터링 요구사항 구현

---

## 1. Contract TASK (인터페이스 계약 정의)

SRS-F 상위 5개 기능을 기준으로 API Contract를 정의한다.

### TASK-C-001: 발주 생성 API Contract

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-F-003 (납기 SLA 계약 이행 기록) |
| 엔드포인트 | `POST /api/v1/orders` |
| 트리거 | CS 담당자가 발주 정보를 시스템에 입력 |
| **입력 파라미터** | `buyerId: string` (바이어 ID) |
| | `items: Array<{ productCode: string, weightKg: number }>` |
| | `promisedDeliveryDate: ISO8601 date` (약정 도착일) |
| | `shippingMethod: 'DHL' \| 'FedEx' \| 'EMS'` |
| **출력 형식** | `{ orderId: string, status: 'CONFIRMED', slaDeadline: ISO8601, trackingLinkStatus: 'PENDING' }` |
| **에러 케이스** | `400 INVALID_BUYER` — 존재하지 않는 바이어 ID |
| | `400 INVALID_DATE` — 약정일이 현재보다 과거 |
| | `422 STOCK_UNAVAILABLE` — 양식장 공급 가능 물량 부족 |
| | `503 LOGISTICS_API_UNAVAILABLE` — 물류 API 응답 불가 (폴백: 추적 링크 수동 입력 대기 상태로 생성) |

---

### TASK-C-002: 온도 이탈 이벤트 처리 API Contract

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-F-006 (온도 이탈 감지 및 알림) |
| 엔드포인트 | MQTT 토픽 `geumtae/shipment/{shipmentId}/sensor` 수신 후 내부 처리 |
| 트리거 | IoT 센서가 온도 데이터를 MQTT로 게시 |
| **입력 파라미터** | `{ shipmentId: string, temp: float, humidity: float, lat: float, lon: float, ts: ISO8601 }` |
| **출력 형식** | 이탈 없을 때: DB 저장만 수행 (응답 없음) |
| | 이탈 감지 시: `{ alertId: string, shipmentId: string, temp: float, alertedAt: ISO8601, notifyStatus: 'SENT' \| 'FAILED' }` |
| **에러 케이스** | `UNKNOWN_SHIPMENT` — shipmentId 매핑 불가 → 미매핑 큐에 임시 저장 |
| | `SENSOR_SPIKE` — 순간 이탈(1회 이벤트) vs 지속 이탈(3회 연속) 구분 필요 |
| | `NOTIFY_FAILED` — LINE/SMS 발송 실패 시 3회 재시도, 실패 지속 시 에러 로그 기록 |

---

### TASK-C-003: 물류 추적 링크 생성 API Contract

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-F-007 (물류 추적 링크 자동 생성 및 발송) |
| 엔드포인트 | `POST /api/v1/shipments/{shipmentId}/tracking-link` |
| 트리거 | 발주 확정 이벤트 발생 시 자동 호출 |
| **입력 파라미터** | `{ shipmentId: string, carrier: 'DHL' \| 'FedEx' \| 'EMS', trackingNumber: string }` |
| **출력 형식** | `{ trackingUrl: string, sentAt: ISO8601, buyerLineMessageId: string }` |
| **에러 케이스** | `404 SHIPMENT_NOT_FOUND` — 존재하지 않는 shipmentId |
| | `502 CARRIER_API_ERROR` — 물류사 API 장애 → 폴백: 추적 링크 필드 null, 수동 입력 플래그 true |
| | `502 LINE_API_ERROR` — LINE 발송 실패 → 재시도 큐에 추가, 최대 3회 재시도 |

---

### TASK-C-004: 클레임 접수 API Contract

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-F-013 (클레임 접수 및 처리 워크플로우) |
| 엔드포인트 | `POST /api/v1/claims` |
| 트리거 | CS 담당자가 바이어 클레임을 시스템에 등록 |
| **입력 파라미터** | `{ shipmentId: string, reason: 'FRESHNESS' \| 'WEIGHT_DISCREPANCY' \| 'LATE_DELIVERY' \| 'OTHER', description: string, evidenceUrls: string[] }` |
| **출력 형식** | `{ claimId: string, status: 'RECEIVED', deadline: ISO8601, assignedTo: string }` |
| **에러 케이스** | `404 SHIPMENT_NOT_FOUND` — 해당 납품 건 없음 |
| | `409 DUPLICATE_CLAIM` — 동일 납품 건 클레임 이미 존재 (상태 조회로 리다이렉트) |
| | `400 MISSING_EVIDENCE` — 선도 불량 클레임 시 사진 증빙 미첨부 |

---

### TASK-C-005: 월간 납품 리포트 생성 API Contract

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-F-016 (발주-납품 이력 관리 및 월간 리포트) |
| 엔드포인트 | `GET /api/v1/reports/monthly?year={year}&month={month}` |
| 트리거 | 매월 1일 자동 실행 (cron) 또는 PO 수동 요청 |
| **입력 파라미터** | `year: number, month: number (1~12)` |
| **출력 형식** | `{ period: string, totalShipments: number, slaComplianceRate: float, returnRate: float, buyerSummary: Array<{buyerId, orderCount, totalKg}>, generatedAt: ISO8601 }` |
| **에러 케이스** | `400 INVALID_PERIOD` — 미래 기간 조회 |
| | `404 NO_DATA` — 해당 월 납품 데이터 없음 (빈 리포트 반환) |

---

## 2. Logic TASK (핵심 비즈니스 로직)

### TASK-L-001: SLA 위반 자동 판정 로직

| 항목 | 내용 |
|------|------|
| 대응 Contract | TASK-C-001 (발주 생성), SRS-F-003 |
| 설명 | 실제 도착일이 등록될 때 약정 도착일과 비교하여 SLA 준수 여부를 판정하고 위반 시 보상액 초안 계산 |
| **핵심 알고리즘/규칙** | 1. `delay = actualDeliveryDate - promisedDeliveryDate` (일 단위) |
| | 2. delay <= 1이면 `SLA_COMPLIANT`, delay > 1이면 `SLA_VIOLATED` |
| | 3. 위반 시 `compensation = delay_days * unit_price * penalty_rate` 자동 계산 |
| | 4. 위반 건 PO에게 알림 발송 (LINE 또는 이메일) |
| **의존성** | Order 테이블 (promisedDeliveryDate), 계약 테이블 (penalty_rate) |

---

### TASK-L-002: 온도 이탈 판정 및 스파이크 필터링

| 항목 | 내용 |
|------|------|
| 대응 Contract | TASK-C-002 (온도 이탈 이벤트 처리), SRS-F-006 |
| 설명 | 센서 데이터 수신 시 온도 임계값 초과 여부를 판정하고 일시적 스파이크(센서 오류)와 실제 이탈을 구분 |
| **핵심 알고리즘/규칙** | 1. 수신 즉시 `temp > 5.0°C` 이면 이탈 후보 등록 |
| | 2. 이후 15분 이내 수신된 2건도 동일 조건이면 "지속 이탈"로 확정 |
| | 3. 1건만 초과 시 "스파이크"로 분류 (알림 없이 로그만 기록) |
| | 4. "지속 이탈" 확정 시 AlertEvent 생성 + 알림 발송 |
| **의존성** | SensorReading 테이블, AlertEvent 테이블, NotificationService |

---

### TASK-L-003: 물류 추적 링크 생성 및 발송 조율

| 항목 | 내용 |
|------|------|
| 대응 Contract | TASK-C-003 (추적 링크 생성), SRS-F-007 |
| 설명 | 발주 확정 이벤트 수신 시 물류사 API를 호출하여 추적 URL을 생성하고 LINE Messaging API로 바이어에게 발송 |
| **핵심 알고리즘/규칙** | 1. Order 상태가 CONFIRMED로 변경될 때 이벤트 발행 |
| | 2. 물류사 API 호출 (carrier 유형에 따라 DHL/FedEx/EMS API 분기) |
| | 3. URL 생성 성공 시 LINE API로 바이어 채널에 메시지 발송 |
| | 4. 물류사 API 장애 시: trackingLink 필드 null, manualEntryRequired: true 플래그 설정 |
| | 5. LINE API 장애 시: 재시도 큐(Redis) 추가, 지수 백오프(1분, 5분, 15분) |
| **의존성** | Order 테이블, Buyer 테이블 (LINE userId), 물류사 API Client, LINE API Client |

---

### TASK-L-004: 클레임 상태 전이 관리

| 항목 | 내용 |
|------|------|
| 대응 Contract | TASK-C-004 (클레임 접수), SRS-F-013 |
| 설명 | 클레임의 상태 전이(RECEIVED → REVIEWING → APPROVED → RESOLVED)를 관리하고 기한 알림을 처리 |
| **핵심 알고리즘/규칙** | 1. 상태 전이 FSM: RECEIVED → REVIEWING (CS 검토 시작) → APPROVED (PO 승인) → RESOLVED (처리 완료) |
| | 2. 잘못된 전이 시도 시 `INVALID_TRANSITION` 에러 반환 |
| | 3. 접수 후 46시간 경과 시 CS 담당자에게 알림 (처리 기한 2시간 전) |
| | 4. RESOLVED 전환 시 바이어에게 결과 자동 통보 (LINE 메시지) |
| **의존성** | Claim 테이블, Shipment 테이블, NotificationService, LINE API Client |

---

### TASK-L-005: 월간 리포트 집계 로직

| 항목 | 내용 |
|------|------|
| 대응 Contract | TASK-C-005 (월간 리포트 생성), SRS-F-016 |
| 설명 | 지정 월의 발주, 납품, 클레임 데이터를 집계하여 KPI 리포트를 생성하고 PO에게 이메일 발송 |
| **핵심 알고리즘/규칙** | 1. `slaComplianceRate = COMPLIANT 건수 / 전체 납품 건수 × 100` |
| | 2. `returnRate = 반품 확정 클레임 건수 / 전체 납품 건수 × 100` |
| | 3. 바이어별 발주 건수, 총 출하량(kg) 집계 |
| | 4. 집계 결과를 JSON 저장 + PDF 생성(선택) + 이메일 발송 |
| **의존성** | Order, Shipment, Claim 테이블, EmailService |

---

## 3. Test TASK (테스트 케이스)

### TASK-T-001: SLA 판정 로직 테스트

| 케이스 유형 | 시나리오 | 기대 결과 |
|------------|---------|----------|
| Happy Path | 약정일 2026-07-01, 실제 도착 2026-07-01 | SLA_COMPLIANT, delay=0 |
| Happy Path | 약정일 2026-07-01, 실제 도착 2026-07-02 (±1일 허용) | SLA_COMPLIANT, delay=1 |
| Edge Case | 약정일 2026-07-01, 실제 도착 2026-07-02 01:00 (경계값) | SLA_COMPLIANT (날짜 기준, 시간 무시) |
| Edge Case | 약정일 2026-07-01, 실제 도착 2026-06-30 (조기 도착) | SLA_COMPLIANT, delay=-1 |
| Failure Case | 약정일 2026-07-01, 실제 도착 2026-07-03 | SLA_VIOLATED, delay=2, 보상액 계산 실행 |
| Failure Case | 실제 도착일 미등록 상태에서 SLA 조회 | SLA_PENDING 상태 반환, 판정 보류 |

---

### TASK-T-002: 온도 이탈 감지 테스트

| 케이스 유형 | 시나리오 | 기대 결과 |
|------------|---------|----------|
| Happy Path | 연속 3회 수신, 모두 4.5°C | 이탈 없음, DB 저장만 수행 |
| Happy Path | 5.0°C 정확히 수신 | 이탈 없음 (경계값: 5.0°C 포함 안 함, >5.0 기준) |
| Edge Case | 5.1°C 1회 수신 후 정상 | 스파이크로 분류, 알림 없음 |
| Edge Case | 5.1°C 3회 연속 수신 | 지속 이탈 확정, 알림 발송 |
| Failure Case | 알 수 없는 shipmentId | 미매핑 큐 저장, PO 알림 |
| Failure Case | 알림 발송 3회 실패 | 에러 로그 기록, 수동 확인 요청 알림 |

---

### TASK-T-003: 추적 링크 생성 및 발송 테스트

| 케이스 유형 | 시나리오 | 기대 결과 |
|------------|---------|----------|
| Happy Path | 발주 확정 → DHL API 정상 응답 → LINE 발송 성공 | 30분 이내 바이어 수신 |
| Happy Path | FedEx API 정상, 추적 URL 생성 후 발송 | trackingUrl 반환, sentAt 기록 |
| Edge Case | 같은 발주 건 중복 요청 | 기존 링크 반환 (새 링크 미생성) |
| Failure Case | DHL API 타임아웃 | manualEntryRequired: true, 링크 없이 발주 확정 |
| Failure Case | LINE API 503 오류 | 재시도 큐 추가, 15분 후 재시도 |

---

### TASK-T-004: 클레임 상태 전이 테스트

| 케이스 유형 | 시나리오 | 기대 결과 |
|------------|---------|----------|
| Happy Path | RECEIVED → REVIEWING → APPROVED → RESOLVED | 각 전이 타임스탬프 기록, RESOLVED 시 바이어 알림 |
| Edge Case | 접수 46시간 후 상태 여전히 REVIEWING | CS 담당자 알림 발송 |
| Edge Case | 접수 후 48시간 이내 RESOLVED | 기한 내 처리 기록 |
| Failure Case | RESOLVED → REVIEWING (역방향 전이 시도) | `INVALID_TRANSITION` 에러 반환 |
| Failure Case | 클레임 중복 접수 (동일 shipmentId) | `409 DUPLICATE_CLAIM`, 기존 클레임 ID 반환 |

---

### TASK-T-005: 월간 리포트 집계 테스트

| 케이스 유형 | 시나리오 | 기대 결과 |
|------------|---------|----------|
| Happy Path | 10건 납품, 10건 SLA 준수 | slaComplianceRate: 100.0 |
| Happy Path | 10건 납품, 1건 반품 | returnRate: 10.0 |
| Edge Case | 납품 0건인 달 조회 | 빈 리포트 반환 (에러 아님) |
| Edge Case | 미래 달 조회 | `400 INVALID_PERIOD` 반환 |
| Failure Case | 이메일 발송 실패 | 리포트 데이터는 저장, 발송 실패 로그 기록 |

---

## 4. NFR TASK (비기능 요구사항 구현)

### TASK-NFR-001: AES-256 암호화 적용

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-NF-005 (바이어 개인정보 보호) |
| 구현 대상 | Buyer 테이블의 계약 금액, 결제 정보, 연락처 필드 |
| 구현 방식 | 애플리케이션 레벨 암호화 (KMS 키 관리) + DB 저장 전 암호화 |
| 완료 기준 | 암호화 필드 목록 문서화. DB 직접 조회 시 암호화 값만 노출 확인 |

---

### TASK-NFR-002: 역할 기반 접근 제어 (RBAC)

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-NF-006 (역할별 권한 분리) |
| 역할 정의 | PO: 전체 조회 + 승인 / CS: 발주·클레임 조작 / LOGISTICS: 납품 상태 갱신 / CUSTOMS: 서류 조회·체크 |
| 구현 방식 | JWT 토큰에 역할 클레임 포함. API 미들웨어에서 역할 검증 |
| 완료 기준 | 각 역할로 권한 외 API 호출 시 403 반환 확인 (테스트 4케이스) |

---

### TASK-NFR-003: IoT 데이터 무결성 검증

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-NF-007 (온도 로그 위변조 방지) |
| 구현 방식 | 센서 데이터 수신 시 `hash = SHA256(shipmentId + temp + ts + secret)` 계산 후 저장. 조회 시 해시 재계산으로 검증 |
| 완료 기준 | 임의 변조 데이터 10건 주입 시 100% 불일치 감지. 위변조 감지 시 알림 발송 |

---

### TASK-NFR-004: 수출신고 데이터 자동 삭제 방지 정책

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-NF-010 (수출신고필증 5년 보관) |
| 구현 방식 | RDS 삭제 방지 활성화. S3 버킷 버저닝 + 객체 잠금(5년 보존). 소프트 삭제 정책 (DB 레코드 is_deleted 플래그) |
| 완료 기준 | 실제 DELETE 쿼리 실행 시도 시 에러 반환 확인. 보존 기간 5년 정책 설정 확인 |

---

### TASK-NFR-005: 시스템 모니터링 대시보드

| 항목 | 내용 |
|------|------|
| 기반 SRS | SRS-NF-004 (99.9% 업타임), SRS-NF-003 (API 응답 P95 2초) |
| 구현 방식 | AWS CloudWatch 메트릭 + 알람 설정. API 응답 시간 P95 측정. 업타임 헬스체크 엔드포인트 |
| 모니터링 항목 | API P95 응답 시간 / 업타임 / IoT 메시지 처리 지연 / 알림 발송 성공률 |
| 완료 기준 | CloudWatch 대시보드 구성 완료. P95 초과 시 알람 발생 확인 |

---

## 5. CQRS 분리

| 기능 | CQRS 분류 | 이유 |
|------|-----------|------|
| 발주 생성 (POST /orders) | Command | 데이터 변경 (Order 생성) |
| 발주 조회 (GET /orders) | Query | 읽기 전용, 캐싱 가능 |
| 납품 상태 갱신 (PATCH /shipments) | Command | 데이터 변경 (상태 전이) |
| 물류 상태 조회 (GET /shipments/{id}/status) | Query | 빈번한 읽기, 캐싱 적합 |
| 온도 데이터 저장 (MQTT 수신) | Command | IoT 이벤트 처리, 쓰기 전용 |
| 온도 이력 조회 (GET /shipments/{id}/temperature) | Query | 온도 로그 읽기 |
| 클레임 접수 (POST /claims) | Command | 클레임 생성 + 알림 발송 |
| 클레임 상태 변경 (PATCH /claims/{id}/status) | Command | 상태 전이 + 알림 발송 |
| 클레임 이력 조회 (GET /claims) | Query | 읽기 전용, 필터·정렬 필요 |
| 통관 서류 체크 (POST /documents/check) | Command | 완료 체크 기록 |
| 서류 현황 조회 (GET /documents) | Query | 체크리스트 읽기 |
| 월간 리포트 생성 (GET /reports/monthly) | Query | 집계 조회 (쓰기 없음) |
| LINE 메시지 발송 | Command | 외부 API 호출 + 이벤트 기록 |
| CS 대화 이력 조회 | Query | 이력 읽기 |

**CQRS 분리 적용 시 이점**

Command 경로는 강한 일관성(Strong Consistency)이 필요하므로 PostgreSQL Write 경로를 통한다. Query 경로는 읽기 복제본(Read Replica) 또는 캐시(Redis)를 활용할 수 있어 API 응답 시간 개선에 직접적으로 기여한다. 특히 납품 이력 조회와 월간 리포트는 Read Replica 활용이 효과적이다.

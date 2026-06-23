---
title: DB 스키마 — GEUMTAE Export
type: db_schema
version: v1.0
status: confirmed
date: 2026-06-21
tags: [postgresql, supabase, schema, geumtae]
related: [SRS, system_overview, api_contracts]
---

# DB 스키마 — GEUMTAE Export

> PostgreSQL 15 (Supabase). 6개 도메인 → 12개 테이블.

---

## 1. 전체 ERD (텍스트)

```
buyers
  └─< orders (buyer_id)
        └─< order_items (order_id)
        └─< sla_violations (order_id)
        └─< shipments (order_id)
              └─< quality_reports (shipment_id)
              └─< sensor_readings (shipment_id)
              └─< temperature_alerts (shipment_id)
              └─< tracking_links (shipment_id)
              └─< document_sets (shipment_id)
                    └─< documents (document_set_id)
              └─< claims (shipment_id)
                    └─< buyer_feedbacks (claim_id)
```

---

## 2. DDL — 전체 테이블

```sql
-- =============================================
-- 1. 바이어 (고객 관리 도메인)
-- =============================================
CREATE TABLE buyers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,                  -- 일본어 지원 (UTF-8)
  line_user_id    text,                           -- LINE Messaging API 사용자 ID
  contract_rate   numeric(6,2),                   -- 계약 단가 ($/kg)
  language        text DEFAULT 'ja',              -- 소통 언어 (ja/en)
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- 2. 발주 (수주관리 도메인)
-- =============================================
CREATE TABLE orders (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id                uuid NOT NULL REFERENCES buyers(id) ON DELETE RESTRICT,
  promised_delivery_date  date NOT NULL,          -- 약정 도착일
  sla_deadline            timestamptz,            -- 약정일 + 1일 (트리거로 자동 산정)
  status                  text NOT NULL DEFAULT 'DRAFT'
                            CHECK (status IN ('DRAFT','CONFIRMED','IN_TRANSIT','DELIVERED','CLOSED')),
  notes                   text,
  created_at              timestamptz DEFAULT now() NOT NULL,
  confirmed_at            timestamptz             -- 발주 확정 시각 (SLA 기산 기준)
);

CREATE TABLE order_items (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_code  text NOT NULL,                    -- ex: GEUMTAE-1KG
  weight_kg     numeric(8,3) NOT NULL,
  unit_price    numeric(8,2) NOT NULL,            -- $/kg
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE sla_violations (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delay_days          integer NOT NULL,
  compensation_amount numeric(10,2),              -- 보상 금액 ($)
  waived              boolean DEFAULT false,      -- 면책 (천재지변 등)
  waive_reason        text,
  created_at          timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- 3. 납품 (출하관리 도메인)
-- =============================================
CREATE TABLE shipments (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id              uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  departure_date        date,
  carrier               text CHECK (carrier IN ('DHL','FedEx','EMS','OTHER')),
  tracking_number       text,
  actual_delivery_at    timestamptz,              -- 실제 도착 시각
  status                text NOT NULL DEFAULT 'PREPARING'
                          CHECK (status IN (
                            'PREPARING','DEPARTED','IN_TRANSIT',
                            'CUSTOMS_CLEARED','DELIVERED'
                          )),
  created_at            timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE quality_reports (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id       uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  weight_kg         numeric(8,3) NOT NULL,        -- 실제 출하 중량
  expected_kg       numeric(8,3),                 -- 발주 중량 (편차 ±5% 검증용)
  freshness_grade   text NOT NULL CHECK (freshness_grade IN ('A','B','C')),
  haccp_lot_number  text NOT NULL,
  water_temp        numeric(4,1),                 -- 출하 수온 (°C)
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- 4. 콜드체인/물류 도메인
-- =============================================
CREATE TABLE sensor_readings (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temp          numeric(5,2) NOT NULL,            -- 온도 (°C)
  humidity      numeric(5,2),                     -- 습도 (%)
  lat           numeric(10,6),
  lon           numeric(10,6),
  ts            timestamptz NOT NULL,             -- 센서 측정 시각
  hash          text,                             -- SHA-256 무결성 해시
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_sensor_readings_shipment_ts
  ON sensor_readings (shipment_id, ts DESC);

CREATE TABLE temperature_alerts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id     uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temp            numeric(5,2) NOT NULL,          -- 이탈 온도
  alerted_at      timestamptz NOT NULL,
  notify_status   text DEFAULT 'PENDING'
                    CHECK (notify_status IN ('PENDING','SENT','FAILED','RESOLVED')),
  resolved_at     timestamptz,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE tracking_links (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  carrier       text NOT NULL,
  tracking_url  text NOT NULL,
  sent_at       timestamptz,                      -- LINE 발송 완료 시각
  created_at    timestamptz DEFAULT now() NOT NULL
);

-- =============================================
-- 5. 통관/서류 도메인
-- =============================================
CREATE TABLE document_sets (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'INCOMPLETE'
                  CHECK (status IN ('INCOMPLETE','COMPLETE','EDI_SENT','EDI_CONFIRMED')),
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE documents (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_set_id   uuid NOT NULL REFERENCES document_sets(id) ON DELETE CASCADE,
  document_type     text NOT NULL
                      CHECK (document_type IN (
                        'HACCP_CERT',
                        'HEALTH_CERT',
                        'ORIGIN_CERT',
                        'EXPORT_DECLARATION'
                      )),
  file_path         text,                         -- Supabase Storage 경로
  issued_at         date,
  verified_at       timestamptz,
  edi_declaration_number  text,                   -- UNI-PASS 신고 번호
  edi_status        text CHECK (edi_status IN ('PENDING','SENT','ACCEPTED','REJECTED')),
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- 법정 보관 5년: 수출신고필증 (NFR-C4)
-- Supabase 설정: Storage bucket retention policy = 5 years

-- =============================================
-- 6. 고객(바이어) 관리 도메인
-- =============================================
CREATE TABLE claims (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id   uuid NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  reason        text NOT NULL,
  status        text NOT NULL DEFAULT 'RECEIVED'
                  CHECK (status IN (
                    'RECEIVED','REVIEWING','APPROVED','RESOLVED','CLOSED'
                  )),
  deadline      timestamptz,                      -- 접수일 + 48시간 (트리거 자동 산정)
  resolved_at   timestamptz,
  resolution    text,                             -- 재납품 / 환불 처리 내용
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE buyer_feedbacks (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id            uuid REFERENCES claims(id) ON DELETE SET NULL,
  buyer_id            uuid NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  rating              integer CHECK (rating BETWEEN 1 AND 5),
  comment             text,
  feedback_type       text CHECK (feedback_type IN ('SAMPLE','POST_DELIVERY','CS')),
  received_at         timestamptz NOT NULL,
  created_at          timestamptz DEFAULT now() NOT NULL
);
```

---

## 3. 트리거 (자동 산정)

```sql
-- orders.sla_deadline = promised_delivery_date + 1일
CREATE OR REPLACE FUNCTION set_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sla_deadline := (NEW.promised_delivery_date + INTERVAL '1 day')::timestamptz;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_sla_deadline
  BEFORE INSERT OR UPDATE OF promised_delivery_date ON orders
  FOR EACH ROW EXECUTE FUNCTION set_sla_deadline();

-- claims.deadline = created_at + 48시간
CREATE OR REPLACE FUNCTION set_claim_deadline()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deadline := NEW.created_at + INTERVAL '48 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_claims_deadline
  BEFORE INSERT ON claims
  FOR EACH ROW EXECUTE FUNCTION set_claim_deadline();
```

---

## 4. RLS (Row Level Security)

```sql
-- 모든 핵심 테이블 RLS 활성화
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

-- 운영 팀(인증된 사용자)은 전체 접근
CREATE POLICY "staff_full_access_orders"
  ON orders FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "staff_full_access_shipments"
  ON shipments FOR ALL
  USING (auth.role() = 'authenticated');

-- 바이어는 본인 발주만 조회 (추적 링크 페이지용 anon 접근)
CREATE POLICY "buyer_view_own_tracking"
  ON tracking_links FOR SELECT
  USING (true);  -- 추적 링크는 공개 (shipmentId가 랜덤 UUID로 추측 불가)
```

---

## 5. 주요 인덱스

```sql
-- 발주 조회 최적화
CREATE INDEX idx_orders_buyer_id ON orders (buyer_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_promised_delivery ON orders (promised_delivery_date);

-- 납품 상태 조회
CREATE INDEX idx_shipments_order_id ON shipments (order_id);
CREATE INDEX idx_shipments_status ON shipments (status);

-- 클레임 미처리 조회
CREATE INDEX idx_claims_status ON claims (status);
CREATE INDEX idx_claims_deadline ON claims (deadline) WHERE status NOT IN ('RESOLVED','CLOSED');

-- 온도 로그 시계열 조회
CREATE INDEX idx_sensor_readings_shipment_ts
  ON sensor_readings (shipment_id, ts DESC);
```

---

## 6. 샘플 데이터 (개발/테스트용)

```sql
-- 바이어 등록
INSERT INTO buyers (name, line_user_id, contract_rate, language)
VALUES ('田中健司', 'U1234567890abcdef', 28.50, 'ja');

-- 발주 생성
INSERT INTO orders (buyer_id, promised_delivery_date, status)
SELECT id, CURRENT_DATE + 3, 'CONFIRMED'
FROM buyers WHERE name = '田中健司';

-- 납품 등록
INSERT INTO shipments (order_id, departure_date, carrier, tracking_number, status)
SELECT id, CURRENT_DATE, 'DHL', 'JD014600012345', 'DEPARTED'
FROM orders LIMIT 1;

-- 품질 성적서
INSERT INTO quality_reports (shipment_id, weight_kg, expected_kg, freshness_grade, haccp_lot_number, water_temp)
SELECT id, 9.85, 10.0, 'A', 'HACCP-2026-001-0623', 12.5
FROM shipments LIMIT 1;
```

---

## 7. 제약 요약

| 규칙 | 구현 방식 |
|---|---|
| 납품 중량 편차 ±5% | `quality_reports` 조회 시 `ABS(weight_kg - expected_kg) / expected_kg <= 0.05` 검증 |
| 온도 이탈 감지 (3회 연속 > 5°C) | FastAPI 워커에서 최근 3건 조회 후 판단 |
| 클레임 48시간 SLA | `claims.deadline` 트리거 자동 산정 + 워커 주기 체크 |
| 수출신고 5년 보관 | Supabase Storage bucket 보존 정책 설정 |
| 바이어 정보 암호화 | `line_user_id`, `contract_rate` → 앱 레벨 AES-256 암호화 후 저장 |

---

## 관련 문서

- [[SRS]]
- [[system_overview]]
- [[api_contracts]]

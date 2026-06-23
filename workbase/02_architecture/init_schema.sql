-- 1. buyers
CREATE TABLE buyers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  line_user_id text,
  contract_rate numeric(6,2),
  language text DEFAULT 'ja',
  is_active boolean DEFAULT true,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 2. orders
CREATE TABLE orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  promised_delivery_date date NOT NULL,
  sla_deadline timestamp WITH TIME ZONE,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED','IN_TRANSIT','DELIVERED','CLOSED')),
  notes text,
  confirmed_at timestamp WITH TIME ZONE,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 3. order_items
CREATE TABLE order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  weight_kg numeric(8,3) NOT NULL,
  unit_price numeric(8,2) NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 4. sla_violations
CREATE TABLE sla_violations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  delay_days integer NOT NULL,
  compensation_amount numeric(10,2),
  waived boolean DEFAULT false,
  waive_reason text,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 5. shipments
CREATE TABLE shipments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  departure_date date,
  carrier text CHECK (carrier IN ('DHL','FedEx','EMS','OTHER')),
  tracking_number text,
  actual_delivery_at timestamp WITH TIME ZONE,
  status text NOT NULL DEFAULT 'PREPARING' CHECK (status IN ('PREPARING','DEPARTED','IN_TRANSIT','CUSTOMS_CLEARED','DELIVERED')),
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 6. quality_reports
CREATE TABLE quality_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  weight_kg numeric(8,3) NOT NULL,
  expected_kg numeric(8,3),
  freshness_grade text NOT NULL CHECK (freshness_grade IN ('A','B','C')),
  haccp_lot_number text NOT NULL,
  water_temp numeric(4,1),
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 7. sensor_readings
CREATE TABLE sensor_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temp numeric(5,2) NOT NULL,
  humidity numeric(5,2),
  lat numeric(10,6),
  lon numeric(10,6),
  ts timestamp WITH TIME ZONE NOT NULL,
  hash text,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 8. temperature_alerts
CREATE TABLE temperature_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temp numeric(5,2) NOT NULL,
  alerted_at timestamp WITH TIME ZONE NOT NULL,
  notify_status text DEFAULT 'PENDING' CHECK (notify_status IN ('PENDING','SENT','FAILED','RESOLVED')),
  resolved_at timestamp WITH TIME ZONE,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 9. tracking_links
CREATE TABLE tracking_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  carrier text NOT NULL,
  tracking_url text NOT NULL,
  sent_at timestamp WITH TIME ZONE,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 10. document_sets
CREATE TABLE document_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'INCOMPLETE' CHECK (status IN ('INCOMPLETE','COMPLETE','EDI_SENT','EDI_CONFIRMED')),
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 11. documents
CREATE TABLE documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_set_id uuid NOT NULL REFERENCES document_sets(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('HACCP_CERT','HEALTH_CERT','ORIGIN_CERT','EXPORT_DECLARATION')),
  file_path text,
  issued_at date,
  verified_at timestamp WITH TIME ZONE,
  edi_declaration_number text,
  edi_status text CHECK (edi_status IN ('PENDING','SENT','ACCEPTED','REJECTED')),
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 12. claims
CREATE TABLE claims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','REVIEWING','APPROVED','RESOLVED','CLOSED')),
  deadline timestamp WITH TIME ZONE,
  resolved_at timestamp WITH TIME ZONE,
  resolution text,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- 13. buyer_feedbacks
CREATE TABLE buyer_feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id uuid REFERENCES claims(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  comment text,
  feedback_type text CHECK (feedback_type IN ('SAMPLE','POST_DELIVERY','CS')),
  received_at timestamp WITH TIME ZONE NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- RLS (Row Level Security) 활성화
-- =============================================
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_feedbacks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 샘플 데이터 INSERT (3건)
-- =============================================
-- 1. Buyers 3건 등록
INSERT INTO buyers (id, name, line_user_id, contract_rate, language)
VALUES 
  ('11111111-1111-1111-1111-111111111111', '田中健司', 'U1234567890abcdef', 28.50, 'ja'),
  ('22222222-2222-2222-2222-222222222222', 'Suzuki Seafoods', 'U2222222222abcdef', 30.00, 'ja'),
  ('33333333-3333-3333-3333-333333333333', 'Global Marine', 'U3333333333abcdef', 27.50, 'en');

-- 2. Orders 3건 등록 (각 바이어당 1건)
INSERT INTO orders (id, buyer_id, promised_delivery_date, status)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE + 3, 'CONFIRMED'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', CURRENT_DATE + 5, 'DRAFT'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', CURRENT_DATE - 1, 'DELIVERED');

-- 3. Shipments 3건 등록 (각 발주당 1건)
INSERT INTO shipments (id, order_id, departure_date, carrier, tracking_number, status)
VALUES 
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE, 'DHL', 'JD014600012345', 'DEPARTED'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', NULL, NULL, NULL, 'PREPARING'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'cccccccc-cccc-cccc-cccc-cccccccccccc', CURRENT_DATE - 3, 'FedEx', 'FX123456789', 'DELIVERED');

아래 raw 강의 노트들을 읽고 workbase 산출물 문서를 만들어줘.

  ## 읽어야 할 소스 파일 (참조만, 수정 금지)

  ### 분석 파트
  - lectures/part1_분석_기획/01주차_산업_경쟁분석/raw/day1_porter5f.md
  - lectures/part1_분석_기획/01주차_산업_경쟁분석/raw/day2_value_chain_swot.md
  - lectures/part1_분석_기획/01주차_산업_경쟁분석/raw/day3_ksf.md
  - lectures/part1_분석_기획/01주차_산업_경쟁분석/raw/day4_problem_definition.md
  - lectures/part1_분석_기획/02주차_시장_고객分석/raw/day1_tam_sam_som.md
  - lectures/part1_분석_기획/02주차_시장_고객分석/raw/day2_persona_cjm.md
  - lectures/part1_분석_기획/02주차_시장_고객分석/raw/day3_aos_dos_moscow.md
  - lectures/part1_분석_기획/02주차_시장_고객分석/raw/day4_jtbd_interview.md

  ### 기획 파트
  - lectures/part1_분석_기획/03주차_기획_문서화/raw/day1_vps.md
  - lectures/part1_분석_기획/03주차_기획_문서화/raw/day2_lean_canvas_mvp.md
  - lectures/part1_분석_기획/03주차_기획_문서화/raw/day3_prd_draft.md
  - lectures/part1_분석_기획/03주차_기획_문서화/raw/day4_prd_v1.md

  ### 기술 명세 파트
  - lectures/part1_분석_기획/04주차_기술명세/raw/day1_srs_mapping.md
  - lectures/part1_분석_기획/04주차_기술명세/raw/day2_srs_draft.md
  - lectures/part1_분석_기획/04주차_기술명세/raw/day3_tasks.md
  - lectures/part1_분석_기획/04주차_기술명세/raw/day4_macro_pipeline.md

  ## 만들어야 할 산출물

  ### 01_product/PRD.md
  - _templates/PRD.md 형식 따를 것
  - 소스: day4_prd_v1.md (메인), day3_prd_draft.md (보완), day1_vps.md (문제 정의)
  - Obsidian 링크 [[SRS]], [[user_stories]] 포함

  ### 01_product/SRS.md
  - _templates/SRS.md 형식 따를 것
  - 소스: day2_srs_draft.md (메인), day1_srs_mapping.md (API 매핑), day4_macro_pipeline.md (시스템 흐름)
  - 데이터 모델 테이블 반드시 포함
  - API 엔드포인트 표 반드시 포함
  - Obsidian 링크 [[PRD]], [[api_contracts]] 포함

  ### 01_product/user_stories.md
  - _templates/user_stories.md 형식 따를 것
  - 소스: day2_persona_cjm.md (페르소나+CJM), day4_jtbd_interview.md (JTBD)
  - 페르소나 2명, JTBD 3개 이상 추출
  - Obsidian 링크 [[PRD]] 포함

  ### 02_architecture/system_overview.md
  - 소스: day4_macro_pipeline.md (메인), day1_srs_mapping.md (보완)
  - 시스템 컴포넌트 다이어그램 (Mermaid 또는 텍스트 그림)
  - 데이터 흐름 설명
  - 기술 스택 표
  - Obsidian 링크 [[SRS]], [[api_contracts]] 포함

  ## 규칙
  - 모든 파일 한국어 작성
  - Obsidian 내부 링크 형식: [[파일명]] (확장자 제외)
  - 교안 강의 내용은 제거하고 내 서비스 기준 실제 내용만 남길 것
  - 소스 파일에서 "예시" 또는 "[서비스명]" 플레이스홀더는 raw 파일 내 실제 서비스명으로 교체
  - 파일 상단 frontmatter (---) 반드시 포함
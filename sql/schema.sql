-- NEXAGRO contacts table (MariaDB / MySQL). Run once in phpMyAdmin on the target database.
CREATE TABLE IF NOT EXISTS contacts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name        VARCHAR(120) NOT NULL,
  job_title        VARCHAR(120) NOT NULL DEFAULT '',
  company_name     VARCHAR(160) NOT NULL,
  industry         VARCHAR(120) NOT NULL,
  email            VARCHAR(160) NOT NULL DEFAULT '',
  phone            VARCHAR(30)  NOT NULL DEFAULT '',
  website          VARCHAR(200) NOT NULL DEFAULT '',
  instagram        VARCHAR(200) NOT NULL DEFAULT '',
  facebook         VARCHAR(200) NOT NULL DEFAULT '',
  linkedin         VARCHAR(200) NOT NULL DEFAULT '',
  tiktok           VARCHAR(200) NOT NULL DEFAULT '',
  notes            TEXT NULL,
  interest_company VARCHAR(160) NOT NULL DEFAULT '',
  consent_at       DATETIME NOT NULL,
  ip_hash          CHAR(64) NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at),
  INDEX idx_ip_created (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-IP call counter for the paid voice endpoints (quick-register, voice-contact, quick-contact).
CREATE TABLE IF NOT EXISTS api_calls (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  endpoint   VARCHAR(32) NOT NULL,
  ip_hash    CHAR(64)    NOT NULL,
  created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_endpoint_ip_created (endpoint, ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

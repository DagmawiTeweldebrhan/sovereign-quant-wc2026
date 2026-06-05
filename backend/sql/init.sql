CREATE TABLE IF NOT EXISTS venues (
    venue_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(3) NOT NULL,
    altitude_meters NUMERIC(6,1) NOT NULL,
    historical_june_humidity NUMERIC(4,1) NOT NULL,
    historical_june_temp_c NUMERIC(4,1) NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
    team_iso VARCHAR(3) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    baseline_elo NUMERIC(6,1) NOT NULL,
    dixon_coles_alpha NUMERIC(5,4) DEFAULT 1.0000,
    dixon_coles_beta NUMERIC(5,4) DEFAULT 1.0000
);

CREATE TABLE IF NOT EXISTS auth_users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'viewer',
    team_iso VARCHAR(3) REFERENCES teams(team_iso) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS managers (
    manager_id VARCHAR(50) PRIMARY KEY,
    team_iso VARCHAR(3) REFERENCES teams(team_iso) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    preferred_formation VARCHAR(10) NOT NULL,
    ppda_factor NUMERIC(4,3) NOT NULL,
    defensive_line_height NUMERIC(4,1) NOT NULL,
    directness_index NUMERIC(4,3) NOT NULL,
    field_tilt_baseline NUMERIC(4,3) NOT NULL,
    system_elasticity NUMERIC(4,3) DEFAULT 0.500
);

CREATE TABLE IF NOT EXISTS player_metrics_2026 (
    player_id VARCHAR(50) PRIMARY KEY,
    team_iso VARCHAR(3) REFERENCES teams(team_iso) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(3) NOT NULL,
    minutes_played_25_26 INT NOT NULL,
    xg_per_90 NUMERIC(4,2) NOT NULL,
    xa_per_90 NUMERIC(4,2) NOT NULL,
    psxg_minus_ga_per_90 NUMERIC(4,2) DEFAULT 0.00,
    progressive_actions_per_90 NUMERIC(4,2) NOT NULL,
    defensive_actions_won_pct NUMERIC(5,2) NOT NULL,
    league_coefficient NUMERIC(3,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS fixtures (
    fixture_id VARCHAR(50) PRIMARY KEY,
    stage VARCHAR(20) NOT NULL,
    home_team_iso VARCHAR(3) REFERENCES teams(team_iso),
    away_team_iso VARCHAR(3) REFERENCES teams(team_iso),
    venue_id VARCHAR(50) REFERENCES venues(venue_id),
    kickoff_time TIMESTAMP NOT NULL,
    home_score INT DEFAULT NULL,
    away_score INT DEFAULT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'SCHEDULED'
);

CREATE TABLE IF NOT EXISTS travel_logs (
    log_id SERIAL PRIMARY KEY,
    team_iso VARCHAR(3) REFERENCES teams(team_iso),
    origin_city VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    flight_distance_km NUMERIC(6,1) NOT NULL,
    time_zones_crossed INT NOT NULL,
    rest_hours_available NUMERIC(5,1) NOT NULL
);

CREATE TABLE IF NOT EXISTS simulation_outputs (
    fixture_id VARCHAR(50) PRIMARY KEY REFERENCES fixtures(fixture_id) ON DELETE CASCADE,
    simulations_run INT NOT NULL DEFAULT 100000,
    home_win_probability NUMERIC(5,4) NOT NULL,
    draw_probability NUMERIC(5,4) NOT NULL,
    away_win_probability NUMERIC(5,4) NOT NULL,
    most_probable_scoreline VARCHAR(10) NOT NULL,
    calculated_brier_score NUMERIC(5,4) DEFAULT NULL,
    simulated_score_distribution JSONB NOT NULL,
    last_computed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON fixtures(home_team_iso, away_team_iso);
CREATE INDEX IF NOT EXISTS idx_player_team_iso ON player_metrics_2026(team_iso);
CREATE INDEX IF NOT EXISTS idx_travel_team_iso ON travel_logs(team_iso);

ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS venues_authenticated_read ON venues;
CREATE POLICY venues_authenticated_read ON venues
    FOR SELECT
    USING (current_setting('app.user_id', true) IS NOT NULL);
DROP POLICY IF EXISTS venues_admin_write ON venues;
CREATE POLICY venues_admin_write ON venues
    FOR ALL
    USING (current_setting('app.role', true) = 'admin')
    WITH CHECK (current_setting('app.role', true) = 'admin');

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teams_authenticated_read ON teams;
CREATE POLICY teams_authenticated_read ON teams
    FOR SELECT
    USING (current_setting('app.user_id', true) IS NOT NULL);
DROP POLICY IF EXISTS teams_admin_write ON teams;
CREATE POLICY teams_admin_write ON teams
    FOR ALL
    USING (current_setting('app.role', true) = 'admin')
    WITH CHECK (current_setting('app.role', true) = 'admin');

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE managers FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS managers_authenticated_read ON managers;
CREATE POLICY managers_authenticated_read ON managers
    FOR SELECT
    USING (current_setting('app.user_id', true) IS NOT NULL);
DROP POLICY IF EXISTS managers_admin_write ON managers;
CREATE POLICY managers_admin_write ON managers
    FOR ALL
    USING (current_setting('app.role', true) = 'admin')
    WITH CHECK (current_setting('app.role', true) = 'admin');

ALTER TABLE player_metrics_2026 ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_metrics_2026 FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS player_metrics_scoped_read ON player_metrics_2026;
CREATE POLICY player_metrics_scoped_read ON player_metrics_2026
    FOR SELECT
    USING (
        current_setting('app.role', true) IN ('admin', 'system')
        OR team_iso = current_setting('app.team_iso', true)
    );
DROP POLICY IF EXISTS player_metrics_admin_write ON player_metrics_2026;
CREATE POLICY player_metrics_admin_write ON player_metrics_2026
    FOR ALL
    USING (current_setting('app.role', true) = 'admin')
    WITH CHECK (current_setting('app.role', true) = 'admin');

ALTER TABLE travel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS travel_logs_scoped_read ON travel_logs;
CREATE POLICY travel_logs_scoped_read ON travel_logs
    FOR SELECT
    USING (
        current_setting('app.role', true) IN ('admin', 'system')
        OR team_iso = current_setting('app.team_iso', true)
    );
DROP POLICY IF EXISTS travel_logs_admin_write ON travel_logs;
CREATE POLICY travel_logs_admin_write ON travel_logs
    FOR ALL
    USING (current_setting('app.role', true) = 'admin')
    WITH CHECK (current_setting('app.role', true) = 'admin');

ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fixtures_scoped_read ON fixtures;
CREATE POLICY fixtures_scoped_read ON fixtures
    FOR SELECT
    USING (
        current_setting('app.role', true) IN ('admin', 'system')
        OR home_team_iso = current_setting('app.team_iso', true)
        OR away_team_iso = current_setting('app.team_iso', true)
    );
DROP POLICY IF EXISTS fixtures_admin_write ON fixtures;
CREATE POLICY fixtures_admin_write ON fixtures
    FOR ALL
    USING (current_setting('app.role', true) = 'admin')
    WITH CHECK (current_setting('app.role', true) = 'admin');

ALTER TABLE simulation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_outputs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS simulation_outputs_scoped_read ON simulation_outputs;
CREATE POLICY simulation_outputs_scoped_read ON simulation_outputs
    FOR SELECT
    USING (
        current_setting('app.role', true) IN ('admin', 'system')
        OR EXISTS (
            SELECT 1
            FROM fixtures f
            WHERE f.fixture_id = simulation_outputs.fixture_id
              AND (
                f.home_team_iso = current_setting('app.team_iso', true)
                OR f.away_team_iso = current_setting('app.team_iso', true)
              )
        )
    );
DROP POLICY IF EXISTS simulation_outputs_system_write ON simulation_outputs;
CREATE POLICY simulation_outputs_system_write ON simulation_outputs
    FOR ALL
    USING (current_setting('app.role', true) IN ('admin', 'system'))
    WITH CHECK (current_setting('app.role', true) IN ('admin', 'system'));

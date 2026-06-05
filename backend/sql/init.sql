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

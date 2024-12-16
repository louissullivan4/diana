CREATE DATABASE IF NOT EXISTS diana_db;

CREATE TABLE IF NOT EXISTS summoners (
    id SERIAL PRIMARY KEY,
    puuid VARCHAR(200) UNIQUE NOT NULL,
    gameName VARCHAR(100) NOT NULL,
    tagLine VARCHAR(10) NOT NULL,
    region VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_ids (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) UNIQUE NOT NULL,
    puuid VARCHAR(100),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (puuid) REFERENCES summoners (puuid)
);

CREATE TABLE IF NOT EXISTS matchDetails (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) UNIQUE NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    

    FOREIGN KEY (match_id) REFERENCES match_ids (match_id)
);
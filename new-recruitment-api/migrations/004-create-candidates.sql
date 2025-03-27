CREATE TABLE IF NOT EXISTS Candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    experience INTEGER,
    notes TEXT,
    consentDate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS CandidateJobOffers (
    candidateId INTEGER NOT NULL,
    jobOfferId INTEGER NOT NULL,
    FOREIGN KEY(candidateId) REFERENCES Candidates(id),
    FOREIGN KEY(jobOfferId) REFERENCES JobOffer(id)
);

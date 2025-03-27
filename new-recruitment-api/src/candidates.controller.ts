import { Request, Response, Router } from "express";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import axios from "axios";

const LEGACY_API_URL = "http://legacy-api:4040/candidates";
const LEGACY_API_KEY = "0194ec39-4437-7c7f-b720-7cd7b2c8d7f4";

export class CandidatesController {
    readonly router = Router();

    constructor() {
        this.router.get('/candidates', this.getAll.bind(this));
        this.router.post('/candidates', this.create.bind(this));
    }

    async getAll(req: Request, res: Response) {
        try {
            const { page = '1', limit = '10' } = req.query;
            const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

            const db = await open({
                filename: "./database.sqlite",
                driver: sqlite3.Database,
            });

            const candidates = await db.all(
                `SELECT * FROM Candidates LIMIT ? OFFSET ?`,
                [limit, offset]
            );

            const total = await db.get("SELECT COUNT(*) as count FROM Candidates");

            res.json({
                data: candidates,
                meta: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total: total.count
                }
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { firstName, lastName, email, phone, experience, notes, jobOffers } = req.body;

            if (!firstName || !lastName || !email || !jobOffers?.length) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            const db = await open({
                filename: "./database.sqlite",
                driver: sqlite3.Database,
            });

            const existing = await db.get(
                "SELECT * FROM Candidates WHERE email = ?",
                [email]
            );
            if (existing) {
                return res.status(409).json({ error: "Email already exists" });
            }

            const consentDate = new Date().toISOString();
            const candidateResult = await db.run(
                `INSERT INTO Candidates (
                    firstName, lastName, email, phone,
                    experience, notes, consentDate, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [firstName, lastName, email, phone, experience, notes, consentDate, 'new']
            );

            for (const jobId of jobOffers) {
                await db.run(
                    `INSERT INTO CandidateJobOffers (candidateId, jobOfferId)
                     VALUES (?, ?)`,
                    [candidateResult.lastID, jobId]
                );
            }

            try {
                const legacyResponse = await axios.post(LEGACY_API_URL, {
                    firstName,
                    lastName,
                    email
                }, {
                    headers: {
                        'x-api-key': LEGACY_API_KEY
                    }
                });

                if (legacyResponse.status === 201) {
                    console.log("Candidate added to Legacy API successfully.");
                }
            } catch (legacyError) {
                console.error("Failed to add candidate to Legacy API:", legacyError.message);
                return res.status(500).json({ error: "Failed to add candidate to Legacy API." });
            }

            res.status(201).json({
                id: candidateResult.lastID,
                firstName,
                lastName,
                email,
                phone,
                experience,
                notes,
                status: 'new'
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
